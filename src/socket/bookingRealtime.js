import { emitSocketEvent } from "./index.js";

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

export const emitBookingRealtimeUpdate = ({
  resource,
  action,
  userId,
  bookingId,
  bookingIds,
  source,
  metadata,
} = {}) => {
  if (!resource || !action) {
    return false;
  }

  const normalizedUserId = userId?.toString?.() ?? userId;
  const normalizedBookingIds = normalizeIds(bookingIds ?? bookingId);
  const payload = {
    resource,
    action,
    bookingId: normalizedBookingIds[0] ?? null,
    bookingIds: normalizedBookingIds,
    userId: normalizedUserId ?? null,
    source: source || "application",
    metadata: metadata && typeof metadata === "object" ? { ...metadata } : undefined,
    occurredAt: new Date().toISOString(),
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

  return emitted;
};
