import crypto from "node:crypto";
import * as dbService from "../../../DB/db.service.js";
import { PaymentCheckoutSession } from "../../../DB/Model/PaymentCheckoutSession.model.js";
import { RoomModel } from "../../../DB/Model/Room.model.js";
import { UserBooking } from "../../../DB/Model/UserBooking.model.js";

const DAY_MS = 1000 * 60 * 60 * 24;

export const activeBookingStatuses = ["pending", "confirmed", "checked-in"];
export const activeCheckoutHoldStatuses = ["open"];

const createHttpError = (message, cause = 400) => new Error(message, { cause });

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

export const normalizeDateOnly = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError("Invalid booking date", 400);
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
};

export const formatDateOnly = (value) => normalizeDateOnly(value).toISOString().slice(0, 10);

export const dateRangesOverlap = (startA, endA, startB, endB) => {
  const normalizedStartA = normalizeDateOnly(startA);
  const normalizedEndA = normalizeDateOnly(endA);
  const normalizedStartB = normalizeDateOnly(startB);
  const normalizedEndB = normalizeDateOnly(endB);

  return normalizedStartA < normalizedEndB && normalizedEndA > normalizedStartB;
};

export const resolveRoomPricePerNight = (room) => {
  const finalPrice = Number(room?.finalPrice);
  if (Number.isFinite(finalPrice) && finalPrice > 0) {
    return roundMoney(finalPrice);
  }

  const basePrice = Number(room?.price || 0);
  const discountPercent = Math.max(0, Math.min(75, Number(room?.discount || 0)));
  return roundMoney(basePrice - (basePrice * discountPercent) / 100);
};

export const parseBookingWindow = ({ checkInDate, checkOutDate }) => {
  const normalizedCheckIn = normalizeDateOnly(checkInDate);
  const normalizedCheckOut = normalizeDateOnly(checkOutDate);
  const today = normalizeDateOnly(new Date());

  if (!(normalizedCheckIn < normalizedCheckOut)) {
    throw createHttpError("Invalid booking dates", 400);
  }

  if (normalizedCheckIn < today) {
    throw createHttpError("Check-in date cannot be in the past", 400);
  }

  const nights = Math.ceil((normalizedCheckOut - normalizedCheckIn) / DAY_MS);

  return {
    checkInDate: normalizedCheckIn,
    checkOutDate: normalizedCheckOut,
    nights,
  };
};

export const buildCheckoutFingerprint = ({ userId, items = [] }) => {
  const normalizedItems = [...items]
    .map((item) => ({
      roomId: String(item.roomId || ""),
      checkInDate: formatDateOnly(item.checkInDate),
      checkOutDate: formatDateOnly(item.checkOutDate),
      guests: Math.max(1, Number(item.guests || 1)),
    }))
    .sort((left, right) =>
      `${left.roomId}:${left.checkInDate}:${left.checkOutDate}:${left.guests}`.localeCompare(
        `${right.roomId}:${right.checkInDate}:${right.checkOutDate}:${right.guests}`,
      ),
    );

  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ userId: String(userId || ""), items: normalizedItems }))
    .digest("hex");
};

export const getUnavailableRangesForRoom = async ({
  roomId,
  excludeCheckoutSessionId = null,
} = {}) => {
  const existingBookings = await dbService.findAll({
    model: UserBooking,
    filter: {
      room: roomId,
      status: { $in: activeBookingStatuses },
    },
    select: "checkInDate checkOutDate status",
    sort: "checkInDate",
  });

  const checkoutHoldFilter = {
    status: { $in: activeCheckoutHoldStatuses },
    expiresAt: { $gt: new Date() },
    "items.room": roomId,
  };

  if (excludeCheckoutSessionId) {
    checkoutHoldFilter._id = { $ne: excludeCheckoutSessionId };
  }

  const checkoutSessions = await PaymentCheckoutSession.find(checkoutHoldFilter)
    .select("items expiresAt")
    .sort({ createdAt: 1 })
    .lean();

  const bookedRanges = existingBookings.map((booking) => ({
    checkInDate: normalizeDateOnly(booking.checkInDate),
    checkOutDate: normalizeDateOnly(booking.checkOutDate),
    status: booking.status,
    source: "booking",
  }));

  const heldRanges = checkoutSessions.flatMap((session) =>
    (session.items || [])
      .filter((item) => String(item.room) === String(roomId))
      .map((item) => ({
        checkInDate: normalizeDateOnly(item.checkInDate),
        checkOutDate: normalizeDateOnly(item.checkOutDate),
        status: "pending-payment",
        source: "checkout",
        expiresAt: session.expiresAt,
      })),
  );

  return [...bookedRanges, ...heldRanges].sort(
    (left, right) => left.checkInDate.getTime() - right.checkInDate.getTime(),
  );
};

export const prepareRoomBookingQuote = async ({
  roomId,
  checkInDate,
  checkOutDate,
  guests = 1,
  excludeCheckoutSessionId = null,
} = {}) => {
  const room = await dbService.findOne({
    model: RoomModel,
    filter: { _id: roomId },
    select:
      "roomName roomNumber roomType price finalPrice discount capacity isAvailable",
  });

  if (!room) {
    throw createHttpError("Room not found", 404);
  }

  if (!room.isAvailable) {
    throw createHttpError("Room is currently unavailable", 409);
  }

  const normalizedGuests = Math.max(1, Number(guests || 1));
  if (normalizedGuests > room.capacity) {
    throw createHttpError("Guests exceed room capacity", 400);
  }

  const parsedWindow = parseBookingWindow({ checkInDate, checkOutDate });
  const unavailableRanges = await getUnavailableRangesForRoom({
    roomId,
    excludeCheckoutSessionId,
  });

  const hasConflict = unavailableRanges.some((range) =>
    dateRangesOverlap(
      range.checkInDate,
      range.checkOutDate,
      parsedWindow.checkInDate,
      parsedWindow.checkOutDate,
    ),
  );

  if (hasConflict) {
    throw createHttpError("Room is no longer available for the selected dates", 409);
  }

  const pricePerNight = resolveRoomPricePerNight(room);
  const totalPrice = roundMoney(parsedWindow.nights * pricePerNight);

  return {
    room,
    item: {
      room: room._id,
      roomName: room.roomName,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      checkInDate: parsedWindow.checkInDate,
      checkOutDate: parsedWindow.checkOutDate,
      nights: parsedWindow.nights,
      guests: normalizedGuests,
      pricePerNight,
      totalPrice,
    },
  };
};
