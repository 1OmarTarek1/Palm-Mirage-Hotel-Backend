import mongoose from "mongoose";
import BookingModel from "../../../DB/Model/bookingTable.model.js";
import { TableModel } from "../../../DB/Model/table.model.js";
import { menuModel } from "../../../DB/Model/Menu.model.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { emitBookingRealtimeUpdate } from "../../../socket/bookingRealtime.js";
import { appendBookingAudit } from "../../../utils/bookingAuditLog.util.js";
import { findActiveStayForUser } from "../../booking/service/booking.service.js";
import { paginate } from "../../../utils/pagination/pagination.js";

/** User + menu line details (name/image) for API responses */
const restaurantBookingFullPopulate = [
  { path: "user", select: "userName email phoneNumber" },
  { path: "lineItems.menuItem", select: "name image" },
];

const mapLineItemsForApi = (lineItems = []) => {
  if (!Array.isArray(lineItems)) return [];
  return lineItems.map((li) => {
    const raw = li?.menuItem;
    const populated = raw && typeof raw === "object" && !(raw instanceof Date);
    const menuItemId = populated
      ? String(raw._id ?? raw.id ?? "")
      : raw != null
        ? String(raw)
        : "";
    return {
      menuItemId,
      nameSnapshot: li.nameSnapshot,
      qty: Number(li.qty ?? 0),
      unitPrice: Number(li.unitPrice ?? 0),
      name: populated && typeof raw.name === "string" ? raw.name : undefined,
      image: populated && typeof raw.image === "string" ? raw.image : undefined,
    };
  });
};

const normalizeRestaurantBooking = (booking) => {
  const item = booking?.toObject ? booking.toObject() : booking;

  if (!item) {
    return null;
  }

  const paymentStatus =
    item.paymentStatus === "paid" || item.paymentStatus === "refunded" || item.paymentStatus === "unpaid"
      ? item.paymentStatus
      : "unpaid";

  const { lineItems: _rawLines, ...rest } = item;

  return {
    ...rest,
    lineItems: mapLineItemsForApi(item.lineItems),
    user: item.user
      ? {
          id: item.user._id ?? item.user.id ?? item.user,
          userName: item.user.userName,
          email: item.user.email,
          phoneNumber: item.user.phoneNumber,
        }
      : null,
    paymentStatus,
  };
};

const loadRestaurantBooking = (bookingId) =>
  dbService.findOne({
    model: BookingModel,
    filter: { _id: bookingId },
    populate: restaurantBookingFullPopulate,
  });

const timeOverlapFilter = (startTime, endTime) => ({
  $or: [
    { startTime: { $lt: endTime, $gte: startTime } },
    { endTime: { $gt: startTime, $lte: endTime } },
    { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
  ],
});

async function findAvailableTable({ startTime, endTime, guests, preferredNumber }) {
  if (preferredNumber) {
    const table = await dbService.findOne({ model: TableModel, filter: { number: preferredNumber } });
    if (!table || guests > table.chairs) return null;
    const conflict = await dbService.findOne({
      model: BookingModel,
      filter: {
        tableNumber: table.number,
        ...timeOverlapFilter(startTime, endTime),
        status: { $nin: ["cancelled"] },
      },
    });
    return conflict ? null : table;
  }

  const tables = await dbService.findAll({ model: TableModel, filter: { chairs: { $gte: guests } } });

  for (const t of tables) {
    const conflict = await dbService.findOne({
      model: BookingModel,
      filter: {
        tableNumber: t.number,
        ...timeOverlapFilter(startTime, endTime),
        status: { $nin: ["cancelled"] },
      },
    });
    if (!conflict) return t;
  }
  return null;
}

async function buildLineItemsFromPayload(lineItemsInput) {
  if (!lineItemsInput?.length) return { lineItems: [], total: 0 };

  const lineItems = [];
  let total = 0;

  for (const row of lineItemsInput) {
    const menuItem = await menuModel.findById(row.menuItemId).lean();
    if (!menuItem || !menuItem.available) {
      throw new Error(`Menu item unavailable: ${row.menuItemId}`);
    }
    const qty = Number(row.qty);
    const unitPrice = Number(menuItem.price);
    lineItems.push({
      menuItem: menuItem._id,
      nameSnapshot: menuItem.name,
      qty,
      unitPrice,
    });
    total += unitPrice * qty;
  }

  return { lineItems, total: Number(total.toFixed(2)) };
}

export const createBooking = asyncHandler(async (req, res, next) => {
  const {
    bookingMode = "table_only",
    number,
    date,
    time,
    guests,
    lineItems: lineItemsInput = [],
    paymentMethod = "cash",
    roomNumber,
  } = req.body;

  const requestedGuests = Number.parseInt(String(guests ?? ""), 10);
  let guestCount = Number.isInteger(requestedGuests) && requestedGuests > 0 ? requestedGuests : null;

  const startTime = new Date(`${date}T${time}:00`);
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

  if (bookingMode === "table_only" && paymentMethod === "stripe") {
    return next(new Error("Table-only reservations use pay-on-arrival (cash)", { cause: 400 }));
  }

  if ((bookingMode === "dine_in" || bookingMode === "room_service" || bookingMode === "pickup") && !lineItemsInput.length) {
    return next(new Error("Add at least one menu item for this booking type", { cause: 400 }));
  }

  let lineItems = [];
  let lineItemsTotal = 0;
  if (lineItemsInput.length) {
    try {
      const built = await buildLineItemsFromPayload(lineItemsInput);
      lineItems = built.lineItems;
      lineItemsTotal = built.total;
    } catch (e) {
      return next(new Error(e.message, { cause: 400 }));
    }
  }

  let linkedUserBooking = undefined;
  if (bookingMode === "room_service") {
    const stay = await findActiveStayForUser(req.user._id);
    if (!stay || !stay.room) {
      return next(new Error("No active hotel stay found for room service", { cause: 400 }));
    }
    if (Number(roomNumber) !== Number(stay.room.roomNumber)) {
      return next(new Error("Room number does not match your current stay", { cause: 400 }));
    }
    linkedUserBooking = stay._id;
    if (!guestCount) {
      guestCount = 1;
    }
  }

  let resolvedTableNumber;
  if (bookingMode === "table_only" || bookingMode === "dine_in") {
    const preferredNumber = number != null ? Number(number) : NaN;
    if (!Number.isInteger(preferredNumber) || preferredNumber < 1) {
      return next(new Error("Please choose a table", { cause: 400 }));
    }
    const table = await findAvailableTable({
      startTime,
      endTime,
      guests: guestCount,
      preferredNumber,
    });
    if (!table || Number(table.number) !== preferredNumber) {
      return next(
        new Error("This table is not available for the chosen time or party size", { cause: 409 }),
      );
    }
    if (!guestCount) {
      guestCount = Number(table.chairs);
    } else if (guestCount > Number(table.chairs)) {
      return next(new Error("Selected guests exceed table capacity", { cause: 400 }));
    }
    resolvedTableNumber = table.number;
  }

  if (!guestCount) {
    guestCount = 1;
  }

  const duplicate = await BookingModel.findOne({
    user: req.user._id,
    startTime,
    endTime,
    status: { $nin: ["cancelled"] },
  });

  if (duplicate) {
    return next(new Error("You already have a restaurant request for this time slot", { cause: 409 }));
  }

  const baseData = {
    user: req.user._id,
    startTime,
    endTime,
    guests: guestCount,
    bookingMode,
    lineItems,
    lineItemsTotal,
    paymentMethod,
    roomNumber: bookingMode === "room_service" ? Number(roomNumber) : undefined,
    linkedUserBooking,
    paymentStatus: "unpaid",
    tableNumber: resolvedTableNumber,
  };

  let status = "pending";
  if (paymentMethod === "stripe") {
    status = "awaiting_payment";
  }

  const booking = await dbService.create({
    model: BookingModel,
    data: {
      ...baseData,
      status,
    },
  });

  const populatedBooking = await loadRestaurantBooking(booking._id);

  await appendBookingAudit({
    entityType: "restaurant_booking",
    entityId: booking._id,
    action: "created",
    actorId: req.user._id,
    after: { bookingMode, status, paymentMethod, lineItemsTotal },
  });

  const msg =
    paymentMethod === "stripe"
      ? "Complete payment to submit your restaurant order."
      : "Your restaurant request was submitted for staff approval.";

  emitBookingRealtimeUpdate({
    resource: "restaurant",
    action: "created",
    userId: req.user._id,
    bookingId: booking._id,
    source: "website",
    title: "Restaurant booking",
    message: msg,
    severity: "info",
  });

  return successResponse({
    res,
    status: 201,
    message: msg,
    data: { booking: normalizeRestaurantBooking(populatedBooking) },
  });
});

export const getAvailableTables = asyncHandler(async (req, res, next) => {
  const { date, time, guests } = req.query;
  const parsedGuests = Number.parseInt(String(guests ?? ""), 10);
  const hasGuestFilter = Number.isInteger(parsedGuests) && parsedGuests > 0;
  const guestCount = hasGuestFilter ? parsedGuests : null;

  const datePart =
    typeof date === "string" && date
      ? date.slice(0, 10)
      : new Date(date).toISOString().slice(0, 10);
  const timePart =
    typeof time === "string" && time
      ? time.slice(0, 5)
      : "";
  const startTime = new Date(`${datePart}T${timePart}:00`);

  if (Number.isNaN(startTime.getTime())) {
    return next(new Error("Invalid date/time slot", { cause: 400 }));
  }
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

  const bookedBookings = await dbService.findAll({
    model: BookingModel,
    filter: {
      ...timeOverlapFilter(startTime, endTime),
      status: { $ne: "cancelled" },
    },
    select: "tableNumber",
  });

  const bookedTableNumbers = bookedBookings.map((b) => b.tableNumber).filter(Boolean);

  const tablesThatFitCapacity = await dbService.findAll({
    model: TableModel,
    filter: guestCount ? { chairs: { $gte: guestCount } } : {},
  });

  const availableTables = await dbService.findAll({
    model: TableModel,
    filter: guestCount
      ? { number: { $nin: bookedTableNumbers }, chairs: { $gte: guestCount } }
      : { number: { $nin: bookedTableNumbers } },
  });

  return successResponse({
    res,
    status: 200,
    message: "Available tables",
    data: {
      tables: availableTables,
      diagnostics: {
        requestedGuests: guestCount,
        usingGuestFilter: hasGuestFilter,
        totalTablesMatchingCapacity: tablesThatFitCapacity.length,
        blockedByTimeOverlap: Math.max(0, tablesThatFitCapacity.length - availableTables.length),
      },
    },
  });
});

export const promoteWaitlist = async (tableNumber, startTime, endTime) => {
  const nextInWaitlist = await BookingModel.findOne({
    tableNumber: null,
    startTime,
    endTime,
    status: "pending",
    $or: [{ bookingMode: "table_only" }, { bookingMode: { $exists: false } }],
  })
    .sort({ createdAt: 1 });

  if (nextInWaitlist) {
    const promotedBooking = await dbService.findOneAndUpdate({
      model: BookingModel,
      filter: { _id: nextInWaitlist._id },
      data: { tableNumber, status: "confirmed" },
      options: { new: true },
    });

    return loadRestaurantBooking(promotedBooking?._id || nextInWaitlist._id);
  }

  return null;
};

export const cancelBooking = asyncHandler(async (req, res, next) => {
  const tableNumber = parseInt(req.params.number, 10);

  if (!tableNumber) {
    return next(new Error("Invalid table number"), { cause: 400 });
  }

  const booking = await BookingModel.findOne({
    tableNumber,
    status: "confirmed",
    startTime: { $gte: new Date() },
  }).sort({ startTime: 1 });

  if (!booking) {
    return next(new Error("No upcoming booking found for this table"), { cause: 404 });
  }

  const cancelledBooking = await dbService.findOneAndUpdate({
    model: BookingModel,
    filter: { _id: booking._id },
    data: { status: "cancelled" },
    options: { new: true },
  });

  const promotedBooking = await promoteWaitlist(booking.tableNumber, booking.startTime, booking.endTime);

  emitBookingRealtimeUpdate({
    resource: "restaurant",
    action: "cancelled",
    userId: booking.user,
    bookingId: booking._id,
    source: "dashboard",
  });

  if (promotedBooking?.user?.id) {
    emitBookingRealtimeUpdate({
      resource: "restaurant",
      action: "promoted",
      userId: promotedBooking.user.id,
      bookingId: promotedBooking._id,
      source: "dashboard",
    });
  }

  return successResponse({
    res,
    status: 200,
    message: "Booking cancelled successfully",
    data: { cancelledBooking: cancelledBooking || booking },
  });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await dbService.findAll({
    model: BookingModel,
    filter: { user: req.user._id },
    populate: restaurantBookingFullPopulate,
    sort: "-createdAt",
  });

  return successResponse({
    res,
    status: 200,
    message: "Your restaurant bookings were retrieved successfully",
    data: { bookings: bookings.map(normalizeRestaurantBooking) },
  });
});

export const cancelMyBooking = asyncHandler(async (req, res, next) => {
  const booking = await BookingModel.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!booking) {
    return next(new Error("Booking not found"), { cause: 404 });
  }

  if (booking.status === "cancelled") {
    return next(new Error("Booking is already cancelled"), { cause: 400 });
  }

  if (booking.status === "completed") {
    return next(new Error("Completed bookings cannot be cancelled"), { cause: 400 });
  }

  if (booking.status !== "awaiting_payment" && (booking.paymentStatus === "paid" || booking.paymentStatus === "refunded")) {
    return next(
      new Error(
        booking.paymentStatus === "paid"
          ? "Paid bookings cannot be cancelled from your account."
          : "This booking cannot be cancelled online."
      ),
      { cause: 400 }
    );
  }

  if (booking.endTime < new Date()) {
    return next(new Error("Past bookings cannot be cancelled"), { cause: 400 });
  }

  booking.status = "cancelled";
  await booking.save();

  let promotedBooking = null;
  if (booking.tableNumber) {
    promotedBooking = await promoteWaitlist(booking.tableNumber, booking.startTime, booking.endTime);
  }

  const updatedBooking = await loadRestaurantBooking(booking._id);

  await appendBookingAudit({
    entityType: "restaurant_booking",
    entityId: booking._id,
    action: "cancelled_by_user",
    actorId: req.user._id,
  });

  emitBookingRealtimeUpdate({
    resource: "restaurant",
    action: "cancelled",
    userId: booking.user,
    bookingId: booking._id,
    source: "website",
    title: "Restaurant booking cancelled",
    message: "Your restaurant booking was cancelled.",
    severity: "info",
  });

  if (promotedBooking?.user?.id) {
    emitBookingRealtimeUpdate({
      resource: "restaurant",
      action: "promoted",
      userId: promotedBooking.user.id,
      bookingId: promotedBooking._id,
      source: "website",
    });
  }

  return successResponse({
    res,
    status: 200,
    message: "Restaurant booking cancelled successfully",
    data: { booking: normalizeRestaurantBooking(updatedBooking) },
  });
});

export const getAllBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, bookingMode, status, paymentStatus, sort } = req.query;
  const filter = {};
  if (bookingMode) filter.bookingMode = bookingMode;
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) {
    filter.$or = [{ bookingMode: { $regex: search, $options: "i" } }];
  }
  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    start_asc: { startTime: 1 },
    start_desc: { startTime: -1 },
  };
  const result = await paginate({
    page: Number(page) || 1,
    size: Number(limit) || 10,
    model: BookingModel,
    filter,
    populate: restaurantBookingFullPopulate,
    sort: sortMap[sort] || { createdAt: -1 },
  });

  return successResponse({
    res,
    status: 200,
    message: "Restaurant bookings retrieved successfully",
    data: {
      bookings: result.data.map(normalizeRestaurantBooking),
      items: result.data.map(normalizeRestaurantBooking),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    },
  });
});

export const updateBookingStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, paymentStatus: nextPaymentStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new Error("Invalid booking id"), { cause: 400 });
  }

  const booking = await dbService.findOne({
    model: BookingModel,
    filter: { _id: id },
  });

  if (!booking) {
    return next(new Error("Booking not found"), { cause: 404 });
  }

  const previousStatus = booking.status;

  if (status === "confirmed" && previousStatus === "pending") {
    if (booking.bookingMode === "dine_in" && !booking.tableNumber) {
      const table = await findAvailableTable({
        startTime: booking.startTime,
        endTime: booking.endTime,
        guests: booking.guests,
      });
      if (!table) {
        return next(new Error("No free table for this slot — try another time", { cause: 400 }));
      }
      booking.tableNumber = table.number;
    }
  }

  booking.status = status;
  if (nextPaymentStatus !== undefined) {
    booking.paymentStatus = nextPaymentStatus;
  }

  let promotedBooking = null;
  if (status === "cancelled" && booking.tableNumber) {
    await booking.save();
    promotedBooking = await promoteWaitlist(booking.tableNumber, booking.startTime, booking.endTime);
  } else {
    await booking.save();
  }

  const updatedBooking = await loadRestaurantBooking(booking._id);

  await appendBookingAudit({
    entityType: "restaurant_booking",
    entityId: booking._id,
    action: "status_updated",
    actorId: req.user?._id,
    before: { status: previousStatus },
    after: { status: booking.status, paymentStatus: booking.paymentStatus },
  });

  emitBookingRealtimeUpdate({
    resource: "restaurant",
    action: "updated",
    userId: booking.user,
    bookingId: booking._id,
    source: "dashboard",
    title: "Restaurant booking updated",
    message: `Restaurant booking is now ${booking.status}.`,
    severity: "success",
  });

  if (promotedBooking?.user?.id) {
    emitBookingRealtimeUpdate({
      resource: "restaurant",
      action: "promoted",
      userId: promotedBooking.user.id,
      bookingId: promotedBooking._id,
      source: "dashboard",
    });
  }

  return successResponse({
    res,
    status: 200,
    message: "Restaurant booking updated successfully",
    data: { booking: normalizeRestaurantBooking(updatedBooking) },
  });
});

export const fulfillRestaurantBookingAfterStripe = async ({ bookingId, checkoutSessionId }) => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking || booking.status !== "awaiting_payment") {
    return { ok: false, reason: "invalid_state" };
  }

  booking.paymentStatus = "paid";
  booking.status = "confirmed";
  booking.checkoutSession = checkoutSessionId;

  if (booking.bookingMode === "dine_in") {
    const table = await findAvailableTable({
      startTime: booking.startTime,
      endTime: booking.endTime,
      guests: booking.guests,
    });
    if (table) {
      booking.tableNumber = table.number;
    }
  }

  await booking.save();

  await appendBookingAudit({
    entityType: "restaurant_booking",
    entityId: bookingId,
    action: "paid_stripe",
    actorId: null,
    metadata: { checkoutSessionId: String(checkoutSessionId) },
  });

  return { ok: true, userId: booking.user };
};

export const cancelRestaurantBookingAwaitingPayment = async (bookingId, reason = "payment_expired") => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking || booking.status !== "awaiting_payment") {
    return { ok: false };
  }

  await BookingModel.findByIdAndUpdate(bookingId, {
    status: "cancelled",
    cancellationReason: reason,
  });

  await appendBookingAudit({
    entityType: "restaurant_booking",
    entityId: bookingId,
    action: "cancelled_payment_timeout",
    metadata: { reason },
  });

  return { ok: true, userId: booking.user };
};
