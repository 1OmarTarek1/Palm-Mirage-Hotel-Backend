import { emitSocketEvent } from "./index.js";
import { persistFromBookingRealtimePayload } from "../modules/notification/notification.service.js";

export const BOOKING_SOCKET_EVENTS = {
  userUpdated: "user.booking.updated",
  dashboardUpdated: "dashboard.booking.updated",
};

const normalizeIds = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => item?.toString?.() ?? item)
      .filter(Boolean);
  }

  if (value === null || value === undefined || value === "") {
    return [];
  }

  return [value?.toString?.() ?? value].filter(Boolean);
};

const defaultNotificationCopy = ({ resource, action }) => {
  const r = resource || "booking";
  const a = action || "updated";
  const title = `${r.replace(/_/g, " ")} ${a}`;
  return { title, message: title, severity: "info" };
};

export const emitBookingRealtimeUpdate = ({
  resource,
  action,
  userId,
  bookingId,
  bookingIds,
  source,
  metadata,
  title,
  message,
  severity,
} = {}) => {
  if (!resource || !action) {
    return false;
  }

  const normalizedUserId = userId?.toString?.() ?? userId;
  const normalizedBookingIds = normalizeIds(bookingIds ?? bookingId);
  const fallback = defaultNotificationCopy({ resource, action });
  const payload = {
    resource,
    action,
    bookingId: normalizedBookingIds[0] ?? null,
    bookingIds: normalizedBookingIds,
    userId: normalizedUserId ?? null,
    source: source || "application",
    metadata: metadata && typeof metadata === "object" ? { ...metadata } : undefined,
    occurredAt: new Date().toISOString(),
    title: title || fallback.title,
    message: message || fallback.message,
    severity: severity || fallback.severity,
  };

  let emitted = false;

  if (normalizedUserId) {
    emitted =
      emitSocketEvent({
        room: `user:${normalizedUserId}`,
        event: BOOKING_SOCKET_EVENTS.userUpdated,
        payload,
      }) || emitted;
  }

  emitted =
    emitSocketEvent({
      room: "role:admin",
      event: BOOKING_SOCKET_EVENTS.dashboardUpdated,
      payload,
    }) || emitted;

  void persistFromBookingRealtimePayload(payload).catch((err) => {
    console.error("[notifications] persist booking realtime failed:", err?.message || err);
  });

  return emitted;
};
