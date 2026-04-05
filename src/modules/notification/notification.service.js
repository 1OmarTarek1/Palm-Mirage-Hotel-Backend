import { Types } from "mongoose";
import { asyncHandler } from "../../utils/response/error.response.js";
import { successResponse } from "../../utils/response/success.response.js";
import { NotificationModel } from "../../DB/Model/Notification.model.js";

const DEDUPE_WINDOW_MS = 90_000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const normalizeBookingIds = (payload) => {
  const raw = payload?.bookingIds?.length ? payload.bookingIds : [];
  const single = payload?.bookingId ? [payload.bookingId] : [];
  const merged = [...raw, ...single].map((id) => id?.toString?.() ?? String(id)).filter(Boolean);
  return [...new Set(merged)].sort();
};

/** Guest-facing noise: generic profile edits still emit realtime + toast but skip inbox. */
const shouldPersistForUserInbox = (payload) => {
  if (!payload?.userId) return false;
  const action = payload.action || "";
  const severity = payload.severity || "info";
  if (action === "updated" && severity === "info") return false;
  return true;
};

const recentDuplicate = async (dedupeKey) => {
  if (!dedupeKey) return null;
  return NotificationModel.findOne({
    dedupeKey,
    createdAt: { $gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
  })
    .select("_id")
    .lean();
};

const toClientShape = (doc) => ({
  id: doc._id.toString(),
  title: doc.title,
  message: doc.message,
  severity: doc.severity,
  type: doc.type,
  resource: doc.resource ?? null,
  action: doc.action ?? null,
  bookingIds: doc.bookingIds || [],
  metadata: doc.metadata || null,
  readAt: doc.readAt ? doc.readAt.toISOString() : null,
  createdAt: doc.createdAt.toISOString(),
});

/**
 * Called from booking realtime pipeline. Hybrid model: sockets + toasts stay immediate;
 * inbox stores durable copy for user + admin (deduped).
 */
export async function persistFromBookingRealtimePayload(payload) {
  if (!payload?.resource || !payload?.action) return;

  const bookingIds = normalizeBookingIds(payload);
  const idsKey = bookingIds.join(",");

  const baseDoc = {
    type: "booking",
    title: payload.title,
    message: payload.message,
    severity: payload.severity || "info",
    resource: payload.resource,
    action: payload.action,
    bookingIds,
    metadata: payload.metadata && typeof payload.metadata === "object" ? { ...payload.metadata } : undefined,
  };

  if (shouldPersistForUserInbox(payload)) {
    const userId = new Types.ObjectId(payload.userId.toString());
    const dedupeKey = `rt:user:${payload.resource}:${payload.action}:${idsKey}:${userId}`;
    if (!(await recentDuplicate(dedupeKey))) {
      await NotificationModel.create({
        ...baseDoc,
        audience: "user",
        userId,
        dedupeKey,
      });
    }
  }

  const adminDedupeKey = `rt:admin:${payload.resource}:${payload.action}:${idsKey}`;
  if (!(await recentDuplicate(adminDedupeKey))) {
    await NotificationModel.create({
      ...baseDoc,
      audience: "admin",
      userId: null,
      dedupeKey: adminDedupeKey,
    });
  }
}

/**
 * Checkout socket emits frequently; only persist milestones (skip fresh "open/unpaid" noise).
 */
export async function persistFromCheckoutSessionDoc(checkoutSessionDoc, socketPayload) {
  const userRef = checkoutSessionDoc?.user;
  if (!userRef) return;

  const status = checkoutSessionDoc.status || "";
  const paymentStatus = checkoutSessionDoc.stripePaymentStatus || "";

  if (status === "open" && (!paymentStatus || paymentStatus === "unpaid")) {
    return;
  }

  const userDedupeKey = `pay:${checkoutSessionDoc._id}:${status}:${paymentStatus}:user`;
  if (await recentDuplicate(userDedupeKey)) return;

  const kind = checkoutSessionDoc.kind || socketPayload?.kind || "room";
  const title =
    paymentStatus === "paid" || status === "fulfilled"
      ? "Payment received"
      : status === "expired"
        ? "Checkout expired"
        : status === "canceled" || status === "cancelled"
          ? "Checkout canceled"
          : "Payment update";

  const message = `${kind} checkout is ${status}${paymentStatus ? ` (${paymentStatus})` : ""}.`;

  const userId = new Types.ObjectId(userRef.toString());
  const metadata = {
    checkoutId: checkoutSessionDoc._id.toString(),
    sessionId: checkoutSessionDoc.stripeSessionId || socketPayload?.sessionId,
    status,
    paymentStatus,
    kind,
  };

  await NotificationModel.create({
    audience: "user",
    userId,
    type: "payment",
    title,
    message,
    severity:
      paymentStatus === "paid" || status === "fulfilled"
        ? "success"
        : status === "expired" || paymentStatus === "failed"
          ? "warning"
          : "info",
    resource: "payment_checkout",
    action: status,
    bookingIds: [],
    metadata,
    dedupeKey: userDedupeKey,
  });

  await NotificationModel.create({
    audience: "admin",
    userId: null,
    type: "payment",
    title,
    message,
    severity: paymentStatus === "paid" || status === "fulfilled" ? "success" : "info",
    resource: "payment_checkout",
    action: status,
    bookingIds: [],
    metadata,
    dedupeKey: `pay:${checkoutSessionDoc._id}:${status}:${paymentStatus}:admin`,
  });
}

const parsePagination = (req) => {
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(req.query.limit) || DEFAULT_PAGE_SIZE),
  );
  const page = Math.max(1, Number(req.query.page) || 1);
  return { limit, skip: (page - 1) * limit, page };
};

export const listMine = asyncHandler(async (req, res) => {
  const { limit, skip, page } = parsePagination(req);
  const filter = { audience: "user", userId: req.user._id };

  const [items, total, unreadCount] = await Promise.all([
    NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    NotificationModel.countDocuments(filter),
    NotificationModel.countDocuments({ ...filter, readAt: null }),
  ]);

  return successResponse({
    res,
    data: {
      notifications: items.map(toClientShape),
      page,
      limit,
      total,
      unreadCount,
    },
    message: "Notifications retrieved",
  });
});

export const unreadCountMine = asyncHandler(async (req, res) => {
  const count = await NotificationModel.countDocuments({
    audience: "user",
    userId: req.user._id,
    readAt: null,
  });
  return successResponse({ res, data: { unreadCount: count } });
});

export const markMineRead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return next(new Error("Invalid notification id", { cause: 400 }));
  }

  const updated = await NotificationModel.findOneAndUpdate(
    { _id: id, audience: "user", userId: req.user._id },
    { readAt: new Date() },
    { new: true },
  ).lean();

  if (!updated) {
    return next(new Error("Notification not found", { cause: 404 }));
  }

  return successResponse({ res, data: { notification: toClientShape(updated) } });
});

export const markAllMineRead = asyncHandler(async (req, res) => {
  await NotificationModel.updateMany(
    { audience: "user", userId: req.user._id, readAt: null },
    { readAt: new Date() },
  );
  return successResponse({ res, data: { ok: true } });
});

export const listAdmin = asyncHandler(async (req, res) => {
  const { limit, skip, page } = parsePagination(req);
  const filter = { audience: "admin" };

  const [items, total, unreadCount] = await Promise.all([
    NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    NotificationModel.countDocuments(filter),
    NotificationModel.countDocuments({ ...filter, readAt: null }),
  ]);

  return successResponse({
    res,
    data: {
      notifications: items.map(toClientShape),
      page,
      limit,
      total,
      unreadCount,
    },
    message: "Admin notifications retrieved",
  });
});

export const unreadCountAdmin = asyncHandler(async (req, res) => {
  const count = await NotificationModel.countDocuments({
    audience: "admin",
    readAt: null,
  });
  return successResponse({ res, data: { unreadCount: count } });
});

export const markAdminRead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return next(new Error("Invalid notification id", { cause: 400 }));
  }

  const updated = await NotificationModel.findOneAndUpdate(
    { _id: id, audience: "admin" },
    { readAt: new Date() },
    { new: true },
  ).lean();

  if (!updated) {
    return next(new Error("Notification not found", { cause: 404 }));
  }

  return successResponse({ res, data: { notification: toClientShape(updated) } });
});

export const markAllAdminRead = asyncHandler(async (req, res) => {
  await NotificationModel.updateMany({ audience: "admin", readAt: null }, { readAt: new Date() });
  return successResponse({ res, data: { ok: true } });
});
