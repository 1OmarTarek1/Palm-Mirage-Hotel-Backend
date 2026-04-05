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
import { persistFromCheckoutSessionDoc } from "../../notification/notification.service.js";
import { appendBookingAudit } from "../../../utils/bookingAuditLog.util.js";
import {
  fulfillActivityBookingAfterStripe,
  cancelActivityBookingAwaitingPayment,
} from "../../activityBooking/services/activityBooking.service.js";
import {
  fulfillRestaurantBookingAfterStripe,
  cancelRestaurantBookingAwaitingPayment,
} from "../../bookingTable/services/bookingTable.service.js";
import { activityBookingModel } from "../../../DB/Model/ActivityBooking.model.js";
import BookingTableModel from "../../../DB/Model/bookingTable.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const checkoutCurrency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
const checkoutExpiresInMinutes = Math.max(
  5,
  Number(process.env.STRIPE_CHECKOUT_EXPIRES_MINUTES || 30),
);

/**
 * Stripe success/cancel URLs must land on the same site the guest used (e.g. Vite dev :5173 vs preview :4173).
 * Prefer the browser Origin when it is allow-listed; only then fall back to CHECKOUT_BASE_URL.
 */
const resolveCheckoutBaseUrl = (req) => {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = req.headers.origin?.trim();
  const configuredBaseUrl = process.env.CHECKOUT_BASE_URL?.trim();

  let baseUrl = null;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    baseUrl = requestOrigin;
  } else if (configuredBaseUrl) {
    baseUrl = configuredBaseUrl;
  } else if (allowedOrigins.length > 0) {
    baseUrl = allowedOrigins[0];
  }

  if (!baseUrl) {
    throw new Error("Unable to resolve checkout redirect URL", { cause: 500 });
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const buildCheckoutUrls = (req) => {
  const normalizedBaseUrl = resolveCheckoutBaseUrl(req);
  const successUrl = `${normalizedBaseUrl}/cart/checkout?payment=success&method=card&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${normalizedBaseUrl}/cart/checkout?payment=cancel&method=card`;

  return {
    successUrl,
    cancelUrl,
  };
};

const buildActivityCheckoutUrls = (req) => {
  const normalizedBaseUrl = resolveCheckoutBaseUrl(req);
  const successUrl = `${normalizedBaseUrl}/activities?payment=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${normalizedBaseUrl}/activities?payment=cancel`;
  return { successUrl, cancelUrl };
};

const buildRestaurantCheckoutUrls = (req) => {
  const normalizedBaseUrl = resolveCheckoutBaseUrl(req);
  const successUrl = `${normalizedBaseUrl}/services/restaurant?payment=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${normalizedBaseUrl}/services/restaurant?payment=cancel`;
  return { successUrl, cancelUrl };
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

const buildStripePayLineItem = (item) => ({
  price_data: {
    currency: checkoutCurrency,
    product_data: {
      name: item.name,
    },
    unit_amount: Math.round(item.totalPrice * 100),
  },
  quantity: item.quantity || 1,
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
    kind: checkoutSessionDoc.kind || "room",
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

  void persistFromCheckoutSessionDoc(checkoutSessionDoc, payload).catch((err) => {
    console.error("[notifications] persist checkout failed:", err?.message || err);
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

const finalizeRoomPaidCheckout = async (checkoutSessionDoc, stripeSession) => {
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

  await appendBookingAudit({
    entityType: "payment_checkout",
    entityId: checkoutSessionDoc._id,
    action: "fulfilled_room",
    actorId: null,
    metadata: { bookingIds: createdBookings.map((b) => String(b._id)) },
  });

  emitBookingRealtimeUpdate({
    resource: "room",
    action: "created",
    userId: checkoutSessionDoc.user,
    bookingIds: createdBookings.map((booking) => booking._id),
    source: "stripe_checkout",
    title: "Room booking confirmed",
    message: "Payment received — your room reservation is confirmed.",
    severity: "success",
    metadata: {
      checkoutId: checkoutSessionDoc._id,
      paymentStatus: checkoutSessionDoc.stripePaymentStatus,
    },
  });

  return checkoutSessionDoc;
};

const finalizeActivityPaidCheckout = async (checkoutSessionDoc, stripeSession) => {
  if (!checkoutSessionDoc.linkedEntityId) {
    throw new Error("Activity checkout missing linked booking", { cause: 400 });
  }

  const result = await fulfillActivityBookingAfterStripe({
    bookingId: checkoutSessionDoc.linkedEntityId,
    checkoutSessionId: checkoutSessionDoc._id,
  });

  if (!result.ok) {
    checkoutSessionDoc.status = "failed";
    checkoutSessionDoc.failureReason = result.reason || "Could not confirm activity booking";
    await checkoutSessionDoc.save();
    emitCheckoutState(checkoutSessionDoc);
    return checkoutSessionDoc;
  }

  checkoutSessionDoc.status = "fulfilled";
  checkoutSessionDoc.fulfilledAt = new Date();
  checkoutSessionDoc.failureReason = undefined;
  await checkoutSessionDoc.save();
  emitCheckoutState(checkoutSessionDoc);

  await appendBookingAudit({
    entityType: "payment_checkout",
    entityId: checkoutSessionDoc._id,
    action: "fulfilled_activity",
    actorId: null,
  });

  emitBookingRealtimeUpdate({
    resource: "activity",
    action: "updated",
    userId: result.userId,
    bookingId: checkoutSessionDoc.linkedEntityId,
    source: "stripe_checkout",
    title: "Activity paid",
    message: "Your activity booking is confirmed.",
    severity: "success",
  });

  return checkoutSessionDoc;
};

const finalizeRestaurantPaidCheckout = async (checkoutSessionDoc, stripeSession) => {
  if (!checkoutSessionDoc.linkedEntityId) {
    throw new Error("Restaurant checkout missing linked booking", { cause: 400 });
  }

  const result = await fulfillRestaurantBookingAfterStripe({
    bookingId: checkoutSessionDoc.linkedEntityId,
    checkoutSessionId: checkoutSessionDoc._id,
  });

  if (!result.ok) {
    checkoutSessionDoc.status = "failed";
    checkoutSessionDoc.failureReason = result.reason || "Could not confirm restaurant booking";
    await checkoutSessionDoc.save();
    emitCheckoutState(checkoutSessionDoc);
    return checkoutSessionDoc;
  }

  checkoutSessionDoc.status = "fulfilled";
  checkoutSessionDoc.fulfilledAt = new Date();
  checkoutSessionDoc.failureReason = undefined;
  await checkoutSessionDoc.save();
  emitCheckoutState(checkoutSessionDoc);

  await appendBookingAudit({
    entityType: "payment_checkout",
    entityId: checkoutSessionDoc._id,
    action: "fulfilled_restaurant",
    actorId: null,
  });

  emitBookingRealtimeUpdate({
    resource: "restaurant",
    action: "updated",
    userId: result.userId,
    bookingId: checkoutSessionDoc.linkedEntityId,
    source: "stripe_checkout",
    title: "Restaurant order paid",
    message: "Payment received — your restaurant booking is confirmed.",
    severity: "success",
  });

  return checkoutSessionDoc;
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
    typeof stripeSession.payment_intent === "string"
      ? stripeSession.payment_intent
      : checkoutSessionDoc.stripePaymentIntentId;
  checkoutSessionDoc.stripeCustomerId =
    typeof stripeSession.customer === "string"
      ? stripeSession.customer
      : checkoutSessionDoc.stripeCustomerId;
  checkoutSessionDoc.stripePaymentStatus =
    stripeSession.payment_status || checkoutSessionDoc.stripePaymentStatus;

  if (checkoutSessionDoc.status === "fulfilled") {
    await checkoutSessionDoc.save();
    emitCheckoutState(checkoutSessionDoc);
    return checkoutSessionDoc;
  }

  const kind = checkoutSessionDoc.kind || "room";

  if (kind === "activity") {
    return finalizeActivityPaidCheckout(checkoutSessionDoc, stripeSession);
  }

  if (kind === "restaurant") {
    return finalizeRestaurantPaidCheckout(checkoutSessionDoc, stripeSession);
  }

  return finalizeRoomPaidCheckout(checkoutSessionDoc, stripeSession);
};

const markCheckoutExpired = async (stripeSession) => {
  const checkoutSessionDoc = await findCheckoutSessionRecord({
    checkoutId: stripeSession.metadata?.checkoutId || stripeSession.client_reference_id,
    stripeSessionId: stripeSession.id,
  });

  if (!checkoutSessionDoc || checkoutSessionDoc.status === "fulfilled") {
    return checkoutSessionDoc;
  }

  const kind = checkoutSessionDoc.kind || "room";

  if (kind === "activity" && checkoutSessionDoc.linkedEntityId) {
    const r = await cancelActivityBookingAwaitingPayment(checkoutSessionDoc.linkedEntityId);
    if (r.ok && r.userId) {
      emitBookingRealtimeUpdate({
        resource: "activity",
        action: "updated",
        userId: r.userId,
        bookingId: checkoutSessionDoc.linkedEntityId,
        source: "stripe_checkout",
        title: "Payment expired",
        message: "Activity checkout expired — booking was cancelled.",
        severity: "warning",
      });
    }
  }

  if (kind === "restaurant" && checkoutSessionDoc.linkedEntityId) {
    const r = await cancelRestaurantBookingAwaitingPayment(checkoutSessionDoc.linkedEntityId);
    if (r.ok && r.userId) {
      emitBookingRealtimeUpdate({
        resource: "restaurant",
        action: "updated",
        userId: r.userId,
        bookingId: checkoutSessionDoc.linkedEntityId,
        source: "stripe_checkout",
        title: "Payment expired",
        message: "Restaurant checkout expired — booking was cancelled.",
        severity: "warning",
      });
    }
  }

  checkoutSessionDoc.status = "expired";
  checkoutSessionDoc.stripePaymentStatus =
    stripeSession.payment_status || checkoutSessionDoc.stripePaymentStatus;
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

  const stripeSession = await stripe.checkout.sessions.retrieve(checkoutSessionDoc.stripeSessionId);

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
    kind: "room",
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
    kind: "room",
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
          checkoutKind: "room",
        },
        payment_intent_data: {
          metadata: {
            checkoutId: checkoutSessionDoc._id.toString(),
            userId: req.user._id.toString(),
            checkoutKind: "room",
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

const createGenericPayCheckout = async ({
  req,
  kind,
  linkedEntityId,
  payItems,
  amountTotal,
  successUrl,
  cancelUrl,
  sessionFingerprint,
  contactEmail,
}) => {
  const checkoutSessionDoc = await PaymentCheckoutSession.create({
    kind,
    linkedEntityId,
    user: req.user._id,
    sessionFingerprint,
    payItems,
    items: [],
    currency: checkoutCurrency,
    amountSubtotal: amountTotal,
    amountTotal,
    status: "creating",
    contactEmail: contactEmail || undefined,
    successUrl,
    cancelUrl,
  });

  const expiresAt = Math.floor(Date.now() / 1000) + checkoutExpiresInMinutes * 60;
  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      line_items: payItems.map(buildStripePayLineItem),
      mode: "payment",
      customer_email: contactEmail || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: expiresAt,
      client_reference_id: checkoutSessionDoc._id.toString(),
      metadata: {
        checkoutId: checkoutSessionDoc._id.toString(),
        userId: req.user._id.toString(),
        checkoutKind: kind,
        linkedEntityId: linkedEntityId.toString(),
      },
      payment_intent_data: {
        metadata: {
          checkoutId: checkoutSessionDoc._id.toString(),
          userId: req.user._id.toString(),
          checkoutKind: kind,
          linkedEntityId: linkedEntityId.toString(),
        },
      },
    },
    {
      idempotencyKey: `checkout_session_${checkoutSessionDoc._id}`,
    },
  );
  session.expires_at = session.expires_at || expiresAt;
  await markCheckoutAsOpen(checkoutSessionDoc, session);
  return checkoutSessionDoc;
};

export const createActivityCheckoutSession = asyncHandler(async (req, res, next) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return next(new Error("Stripe secret key is not configured", { cause: 500 }));
  }

  const { activityBookingId } = req.body;
  if (!Types.ObjectId.isValid(activityBookingId)) {
    return next(new Error("Invalid activity booking id", { cause: 400 }));
  }

  const booking = await activityBookingModel.findById(activityBookingId);
  if (!booking || String(booking.user) !== String(req.user._id)) {
    return next(new Error("Activity booking not found", { cause: 404 }));
  }

  if (booking.status !== "awaiting_payment") {
    return next(new Error("This booking is not awaiting payment", { cause: 400 }));
  }

  const sessionFingerprint = `activity:${req.user._id}:${activityBookingId}`;
  const reusableSession = await PaymentCheckoutSession.findOne({
    user: req.user._id,
    sessionFingerprint,
    kind: "activity",
    status: "open",
    expiresAt: { $gt: new Date() },
    stripeSessionUrl: { $exists: true, $ne: null },
  }).sort({ createdAt: -1 });

  if (reusableSession?.stripeSessionUrl) {
    const syncedSession = await syncStripeSessionState(reusableSession);
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
        },
      });
    }
  }

  const payItems = [
    {
      name: `Activity booking (${booking.guests} guest${booking.guests > 1 ? "s" : ""})`,
      totalPrice: booking.totalPrice,
      quantity: 1,
    },
  ];
  const amountTotal = Number(booking.totalPrice);

  const { successUrl, cancelUrl } = buildActivityCheckoutUrls(req);
  const contactEmail = String(req.user.email || "").trim().toLowerCase();

  try {
    const checkoutSessionDoc = await createGenericPayCheckout({
      req,
      kind: "activity",
      linkedEntityId: booking._id,
      payItems,
      amountTotal,
      successUrl,
      cancelUrl,
      sessionFingerprint,
      contactEmail,
    });

    await activityBookingModel.findByIdAndUpdate(booking._id, {
      checkoutSession: checkoutSessionDoc._id,
    });

    await appendBookingAudit({
      entityType: "payment_checkout",
      entityId: checkoutSessionDoc._id,
      action: "created_activity",
      actorId: req.user._id,
    });

    return successResponse({
      res,
      message: "Checkout session created",
      data: {
        url: checkoutSessionDoc.stripeSessionUrl,
        sessionId: checkoutSessionDoc.stripeSessionId,
        checkoutId: checkoutSessionDoc._id,
        expiresAt: checkoutSessionDoc.expiresAt,
        reused: false,
      },
    });
  } catch (error) {
    throw error;
  }
});

export const createRestaurantCheckoutSession = asyncHandler(async (req, res, next) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return next(new Error("Stripe secret key is not configured", { cause: 500 }));
  }

  const { restaurantBookingId } = req.body;
  if (!Types.ObjectId.isValid(restaurantBookingId)) {
    return next(new Error("Invalid restaurant booking id", { cause: 400 }));
  }

  const booking = await BookingTableModel.findById(restaurantBookingId);
  if (!booking || String(booking.user) !== String(req.user._id)) {
    return next(new Error("Restaurant booking not found", { cause: 404 }));
  }

  if (booking.status !== "awaiting_payment") {
    return next(new Error("This booking is not awaiting payment", { cause: 400 }));
  }

  const sessionFingerprint = `restaurant:${req.user._id}:${restaurantBookingId}`;
  const reusableSession = await PaymentCheckoutSession.findOne({
    user: req.user._id,
    sessionFingerprint,
    kind: "restaurant",
    status: "open",
    expiresAt: { $gt: new Date() },
    stripeSessionUrl: { $exists: true, $ne: null },
  }).sort({ createdAt: -1 });

  if (reusableSession?.stripeSessionUrl) {
    const syncedSession = await syncStripeSessionState(reusableSession);
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
        },
      });
    }
  }

  const lineLabel =
    booking.lineItems?.length > 0
      ? `Restaurant order (${booking.bookingMode})`
      : "Restaurant booking";

  const payItems = [
    {
      name: lineLabel,
      totalPrice: booking.lineItemsTotal || 0,
      quantity: 1,
    },
  ];
  const amountTotal = Number(booking.lineItemsTotal || 0);
  if (amountTotal <= 0) {
    return next(new Error("Nothing to pay for this booking", { cause: 400 }));
  }

  const { successUrl, cancelUrl } = buildRestaurantCheckoutUrls(req);
  const contactEmail = String(req.user.email || "").trim().toLowerCase();

  const checkoutSessionDoc = await createGenericPayCheckout({
    req,
    kind: "restaurant",
    linkedEntityId: booking._id,
    payItems,
    amountTotal,
    successUrl,
    cancelUrl,
    sessionFingerprint,
    contactEmail,
  });

  booking.checkoutSession = checkoutSessionDoc._id;
  await booking.save();

  await appendBookingAudit({
    entityType: "payment_checkout",
    entityId: checkoutSessionDoc._id,
    action: "created_restaurant",
    actorId: req.user._id,
  });

  return successResponse({
    res,
    message: "Checkout session created",
    data: {
      url: checkoutSessionDoc.stripeSessionUrl,
      sessionId: checkoutSessionDoc.stripeSessionId,
      checkoutId: checkoutSessionDoc._id,
      expiresAt: checkoutSessionDoc.expiresAt,
      reused: false,
    },
  });
});

export const getCheckoutSessionStatus = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  const checkoutSessionDoc = await PaymentCheckoutSession.findOne({
    stripeSessionId: sessionId,
    user: req.user._id,
  }).select(
    "_id kind stripeSessionId status stripePaymentStatus expiresAt fulfilledAt amountTotal currency linkedEntityId",
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
      kind: checkoutSessionDoc.kind || "room",
      linkedEntityId: checkoutSessionDoc.linkedEntityId,
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
