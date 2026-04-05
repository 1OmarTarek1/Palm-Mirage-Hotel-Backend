import Stripe from "stripe";
import { Types } from "mongoose";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { PaymentCheckoutSession } from "../../../DB/Model/PaymentCheckoutSession.model.js";
import {
  buildCheckoutFingerprint,
  prepareRoomBookingQuote,
} from "../../booking/service/booking.helpers.js";
import { getAllowedOrigins } from "../../../config/origins.js";
import { UserBooking } from "../../../DB/Model/UserBooking.model.js";
import { emitSocketEvent } from "../../../socket/index.js";
import { emitBookingRealtimeUpdate } from "../../../socket/bookingRealtime.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const checkoutCurrency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
const checkoutExpiresInMinutes = Math.max(
  5,
  Number(process.env.STRIPE_CHECKOUT_EXPIRES_MINUTES || 30),
);

const buildCheckoutUrls = (req) => {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = req.headers.origin?.trim();
  const configuredBaseUrl = process.env.CHECKOUT_BASE_URL?.trim();
  const baseUrl =
    configuredBaseUrl ||
    (requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0]);

  if (!baseUrl) {
    throw new Error("Unable to resolve checkout redirect URL", { cause: 500 });
  }

  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const successUrl = `${normalizedBaseUrl}/cart/checkout?payment=success&method=card&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${normalizedBaseUrl}/cart/checkout?payment=cancel&method=card`;

  return {
    successUrl,
    cancelUrl,
  };
};

const buildStripeLineItem = (item) => ({
  price_data: {
    currency: checkoutCurrency,
    product_data: {
      name: `${item.roomName} (${item.nights} night${item.nights > 1 ? "s" : ""})`,
    },
    unit_amount: Math.round(item.totalPrice * 100),
  },
  quantity: 1,
});

const emitCheckoutState = (checkoutSessionDoc) => {
  const payload = {
    checkoutId: checkoutSessionDoc._id.toString(),
    sessionId: checkoutSessionDoc.stripeSessionId,
    status: checkoutSessionDoc.status,
    paymentStatus: checkoutSessionDoc.stripePaymentStatus,
    expiresAt: checkoutSessionDoc.expiresAt,
    fulfilledAt: checkoutSessionDoc.fulfilledAt,
    amountTotal: checkoutSessionDoc.amountTotal,
    currency: checkoutSessionDoc.currency,
  };

  emitSocketEvent({
    room: `user:${checkoutSessionDoc.user.toString()}`,
    event: "payment.checkout.updated",
    payload,
  });

  emitSocketEvent({
    room: "role:admin",
    event: "dashboard.payment.updated",
    payload,
  });
};

const findCheckoutSessionRecord = async ({
  checkoutId,
  stripeSessionId,
  stripePaymentIntentId,
} = {}) => {
  if (checkoutId && Types.ObjectId.isValid(checkoutId)) {
    const byCheckoutId = await PaymentCheckoutSession.findById(checkoutId);
    if (byCheckoutId) return byCheckoutId;
  }

  if (stripeSessionId) {
    const byStripeSessionId = await PaymentCheckoutSession.findOne({ stripeSessionId });
    if (byStripeSessionId) return byStripeSessionId;
  }

  if (stripePaymentIntentId) {
    const byPaymentIntentId = await PaymentCheckoutSession.findOne({ stripePaymentIntentId });
    if (byPaymentIntentId) return byPaymentIntentId;
  }

  return null;
};

const markCheckoutAsOpen = async (checkoutSessionDoc, stripeSession) => {
  checkoutSessionDoc.status = "open";
  checkoutSessionDoc.stripeSessionId = stripeSession.id;
  checkoutSessionDoc.stripeSessionUrl = stripeSession.url;
  checkoutSessionDoc.stripePaymentIntentId =
    typeof stripeSession.payment_intent === "string" ? stripeSession.payment_intent : undefined;
  checkoutSessionDoc.stripeCustomerId =
    typeof stripeSession.customer === "string" ? stripeSession.customer : undefined;
  checkoutSessionDoc.stripePaymentStatus = stripeSession.payment_status || "unpaid";
  checkoutSessionDoc.expiresAt = new Date(stripeSession.expires_at * 1000);
  checkoutSessionDoc.failureReason = undefined;

  await checkoutSessionDoc.save();
  emitCheckoutState(checkoutSessionDoc);
};

const finalizePaidCheckout = async (stripeSession) => {
  const checkoutSessionDoc = await findCheckoutSessionRecord({
    checkoutId: stripeSession.metadata?.checkoutId || stripeSession.client_reference_id,
    stripeSessionId: stripeSession.id,
    stripePaymentIntentId:
      typeof stripeSession.payment_intent === "string" ? stripeSession.payment_intent : undefined,
  });

  if (!checkoutSessionDoc) {
    throw new Error("Checkout session record not found", { cause: 404 });
  }

  checkoutSessionDoc.stripeSessionId = stripeSession.id;
  checkoutSessionDoc.stripeSessionUrl = stripeSession.url || checkoutSessionDoc.stripeSessionUrl;
  checkoutSessionDoc.stripePaymentIntentId =
    typeof stripeSession.payment_intent === "string" ? stripeSession.payment_intent : checkoutSessionDoc.stripePaymentIntentId;
  checkoutSessionDoc.stripeCustomerId =
    typeof stripeSession.customer === "string" ? stripeSession.customer : checkoutSessionDoc.stripeCustomerId;
  checkoutSessionDoc.stripePaymentStatus = stripeSession.payment_status || checkoutSessionDoc.stripePaymentStatus;

  if (checkoutSessionDoc.status === "fulfilled") {
    await checkoutSessionDoc.save();
    emitCheckoutState(checkoutSessionDoc);
    return checkoutSessionDoc;
  }

  const existingBookings = await UserBooking.find({
    checkoutSession: checkoutSessionDoc._id,
  }).select("_id");

  if (
    existingBookings.length > 0 &&
    existingBookings.length !== checkoutSessionDoc.items.length
  ) {
    checkoutSessionDoc.status = "completed";
    checkoutSessionDoc.failureReason =
      "Partial fulfillment detected. Manual review is required before refunding or confirming.";
    await checkoutSessionDoc.save();
    emitCheckoutState(checkoutSessionDoc);
    return checkoutSessionDoc;
  }

  if (existingBookings.length === checkoutSessionDoc.items.length) {
    checkoutSessionDoc.status = "fulfilled";
    checkoutSessionDoc.fulfilledAt = checkoutSessionDoc.fulfilledAt || new Date();
    checkoutSessionDoc.failureReason = undefined;
    await checkoutSessionDoc.save();
    emitCheckoutState(checkoutSessionDoc);
    return checkoutSessionDoc;
  }

  for (const item of checkoutSessionDoc.items) {
    await prepareRoomBookingQuote({
      roomId: item.room,
      checkInDate: item.checkInDate,
      checkOutDate: item.checkOutDate,
      guests: item.guests,
      excludeCheckoutSessionId: checkoutSessionDoc._id,
    });
  }

  const bookingPayload = checkoutSessionDoc.items.map((item) => ({
    user: checkoutSessionDoc.user,
    room: item.room,
    checkoutSession: checkoutSessionDoc._id,
    checkInDate: item.checkInDate,
    checkOutDate: item.checkOutDate,
    nights: item.nights,
    pricePerNight: item.pricePerNight,
    totalPrice: item.totalPrice,
    guests: item.guests,
    status: "confirmed",
    paymentStatus: "paid",
    paymentMethod: "card",
    specialRequests:
      checkoutSessionDoc.bookingNotes || "Booked from Website / Stripe Checkout",
  }));

  const createdBookings = await UserBooking.insertMany(bookingPayload, { ordered: true });

  checkoutSessionDoc.status = "fulfilled";
  checkoutSessionDoc.fulfilledAt = new Date();
  checkoutSessionDoc.failureReason = undefined;
  await checkoutSessionDoc.save();
  emitCheckoutState(checkoutSessionDoc);
  emitBookingRealtimeUpdate({
    resource: "room",
    action: "created",
    userId: checkoutSessionDoc.user,
    bookingIds: createdBookings.map((booking) => booking._id),
    source: "stripe_checkout",
    metadata: {
      checkoutId: checkoutSessionDoc._id,
      paymentStatus: checkoutSessionDoc.stripePaymentStatus,
    },
  });

  return checkoutSessionDoc;
};

const markCheckoutExpired = async (stripeSession) => {
  const checkoutSessionDoc = await findCheckoutSessionRecord({
    checkoutId: stripeSession.metadata?.checkoutId || stripeSession.client_reference_id,
    stripeSessionId: stripeSession.id,
  });

  if (!checkoutSessionDoc || checkoutSessionDoc.status === "fulfilled") {
    return checkoutSessionDoc;
  }

  checkoutSessionDoc.status = "expired";
  checkoutSessionDoc.stripePaymentStatus = stripeSession.payment_status || checkoutSessionDoc.stripePaymentStatus;
  checkoutSessionDoc.expiresAt = new Date();
  checkoutSessionDoc.failureReason = undefined;
  await checkoutSessionDoc.save();
  emitCheckoutState(checkoutSessionDoc);

  return checkoutSessionDoc;
};

const markCheckoutFailed = async (paymentIntent) => {
  const checkoutSessionDoc = await findCheckoutSessionRecord({
    checkoutId: paymentIntent.metadata?.checkoutId,
    stripePaymentIntentId: paymentIntent.id,
  });

  if (!checkoutSessionDoc || checkoutSessionDoc.status === "fulfilled") {
    return checkoutSessionDoc;
  }

  checkoutSessionDoc.status = "failed";
  checkoutSessionDoc.stripePaymentIntentId = paymentIntent.id;
  checkoutSessionDoc.stripePaymentStatus = "unpaid";
  checkoutSessionDoc.failureReason =
    paymentIntent.last_payment_error?.message || "Payment failed";
  await checkoutSessionDoc.save();
  emitCheckoutState(checkoutSessionDoc);

  return checkoutSessionDoc;
};

const syncStripeSessionState = async (checkoutSessionDoc) => {
  if (!checkoutSessionDoc?.stripeSessionId) {
    return checkoutSessionDoc;
  }

  const stripeSession = await stripe.checkout.sessions.retrieve(
    checkoutSessionDoc.stripeSessionId,
  );

  checkoutSessionDoc.stripePaymentStatus =
    stripeSession.payment_status || checkoutSessionDoc.stripePaymentStatus;
  checkoutSessionDoc.expiresAt = stripeSession.expires_at
    ? new Date(stripeSession.expires_at * 1000)
    : checkoutSessionDoc.expiresAt;

  if (stripeSession.status === "complete") {
    await finalizePaidCheckout(stripeSession);
    return PaymentCheckoutSession.findById(checkoutSessionDoc._id);
  }

  if (stripeSession.status === "expired") {
    await markCheckoutExpired(stripeSession);
    return PaymentCheckoutSession.findById(checkoutSessionDoc._id);
  }

  if (stripeSession.status === "open") {
    checkoutSessionDoc.status = "open";
    checkoutSessionDoc.stripeSessionUrl =
      stripeSession.url || checkoutSessionDoc.stripeSessionUrl;
    checkoutSessionDoc.failureReason = undefined;
    await checkoutSessionDoc.save();
    return checkoutSessionDoc;
  }

  await checkoutSessionDoc.save();
  return checkoutSessionDoc;
};

export const createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { items, customerEmail, bookingNotes } = req.body;

  if (!process.env.STRIPE_SECRET_KEY) {
    return next(new Error("Stripe secret key is not configured", { cause: 500 }));
  }

  const duplicateRoomIds = new Set();
  for (const item of items) {
    const roomId = String(item.roomId);
    if (duplicateRoomIds.has(roomId)) {
      return next(new Error("A room can only appear once per checkout", { cause: 400 }));
    }
    duplicateRoomIds.add(roomId);
  }

  const sessionFingerprint = buildCheckoutFingerprint({
    userId: req.user._id,
    items,
  });

  const reusableSession = await PaymentCheckoutSession.findOne({
    user: req.user._id,
    sessionFingerprint,
    status: "open",
    expiresAt: { $gt: new Date() },
    stripeSessionUrl: { $exists: true, $ne: null },
  }).sort({ createdAt: -1 });

  if (reusableSession?.stripeSessionUrl) {
    const syncedSession = await syncStripeSessionState(reusableSession);

    if (syncedSession?.status === "fulfilled") {
      return successResponse({
        res,
        message: "Checkout already fulfilled",
        data: {
          url: null,
          sessionId: syncedSession.stripeSessionId,
          checkoutId: syncedSession._id,
          expiresAt: syncedSession.expiresAt,
          reused: false,
          status: syncedSession.status,
        },
      });
    }

    if (syncedSession?.status === "open" && syncedSession?.stripeSessionUrl) {
      return successResponse({
        res,
        message: "Checkout session reused",
        data: {
          url: syncedSession.stripeSessionUrl,
          sessionId: syncedSession.stripeSessionId,
          checkoutId: syncedSession._id,
          expiresAt: syncedSession.expiresAt,
          reused: true,
          status: syncedSession.status,
        },
      });
    }
  }

  const preparedItems = [];
  for (const item of items) {
    const prepared = await prepareRoomBookingQuote({
      roomId: item.roomId,
      checkInDate: item.checkInDate,
      checkOutDate: item.checkOutDate,
      guests: item.guests,
    });

    preparedItems.push(prepared.item);
  }

  const amountTotal = Number(
    preparedItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2),
  );
  const { successUrl, cancelUrl } = buildCheckoutUrls(req);
  const contactEmail = String(customerEmail || req.user.email || "").trim().toLowerCase();

  const checkoutSessionDoc = await PaymentCheckoutSession.create({
    user: req.user._id,
    sessionFingerprint,
    items: preparedItems,
    currency: checkoutCurrency,
    amountSubtotal: amountTotal,
    amountTotal,
    status: "creating",
    contactEmail: contactEmail || undefined,
    bookingNotes: bookingNotes || undefined,
    successUrl,
    cancelUrl,
  });

  try {
    const expiresAt = Math.floor(Date.now() / 1000) + checkoutExpiresInMinutes * 60;
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: preparedItems.map(buildStripeLineItem),
        mode: "payment",
        customer_email: contactEmail || undefined,
        success_url: successUrl,
        cancel_url: cancelUrl,
        expires_at: expiresAt,
        client_reference_id: checkoutSessionDoc._id.toString(),
        metadata: {
          checkoutId: checkoutSessionDoc._id.toString(),
          userId: req.user._id.toString(),
          bookingCount: String(preparedItems.length),
        },
        payment_intent_data: {
          metadata: {
            checkoutId: checkoutSessionDoc._id.toString(),
            userId: req.user._id.toString(),
          },
        },
      },
      {
        idempotencyKey: `checkout_session_${checkoutSessionDoc._id}`,
      },
    );
    session.expires_at = session.expires_at || expiresAt;
    await markCheckoutAsOpen(checkoutSessionDoc, session);

    return successResponse({
      res,
      message: "Checkout session created",
      data: {
        url: session.url,
        sessionId: session.id,
        checkoutId: checkoutSessionDoc._id,
        expiresAt: checkoutSessionDoc.expiresAt,
        reused: false,
      },
    });
  } catch (error) {
    checkoutSessionDoc.status = "failed";
    checkoutSessionDoc.failureReason = error.message;
    await checkoutSessionDoc.save().catch(() => null);
    throw error;
  }
});

export const getCheckoutSessionStatus = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  const checkoutSessionDoc = await PaymentCheckoutSession.findOne({
    stripeSessionId: sessionId,
    user: req.user._id,
  }).select(
    "_id stripeSessionId status stripePaymentStatus expiresAt fulfilledAt amountTotal currency",
  );

  if (!checkoutSessionDoc) {
    return next(new Error("Checkout session not found", { cause: 404 }));
  }

  const bookingsCount = await UserBooking.countDocuments({
    checkoutSession: checkoutSessionDoc._id,
  });

  return successResponse({
    res,
    message: "Checkout session status retrieved",
    data: {
      checkoutId: checkoutSessionDoc._id,
      sessionId: checkoutSessionDoc.stripeSessionId,
      status: checkoutSessionDoc.status,
      paymentStatus: checkoutSessionDoc.stripePaymentStatus,
      expiresAt: checkoutSessionDoc.expiresAt,
      fulfilledAt: checkoutSessionDoc.fulfilledAt,
      amountTotal: checkoutSessionDoc.amountTotal,
      currency: checkoutSessionDoc.currency,
      bookingsCount,
    },
  });
});

export const handleStripeWebhook = async (req, res, next) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ message: "Stripe webhook secret is not configured" });
  }

  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await finalizePaidCheckout(event.data.object);
        break;

      case "checkout.session.expired":
        await markCheckoutExpired(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await markCheckoutFailed(event.data.object);
        break;

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
};
