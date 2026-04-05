import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { UserBooking } from "../../../DB/Model/UserBooking.model.js";
import { RoomModel } from "../../../DB/Model/Room.model.js";
import { roleTypes } from "../../../DB/Model/User.model.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { emitBookingRealtimeUpdate } from "../../../socket/bookingRealtime.js";
import { appendBookingAudit } from "../../../utils/bookingAuditLog.util.js";
import {
  dateRangesOverlap,
  getUnavailableRangesForRoom,
  parseBookingWindow,
  prepareRoomBookingQuote,
} from "./booking.helpers.js";

const roomBookingPopulate = [
  { path: "room", select: "roomName roomNumber roomType price roomImages" },
  { path: "user", select: "userName email" },
];

const loadBookingWithRelations = (bookingId) =>
  dbService.findOne({
    model: UserBooking,
    filter: { _id: bookingId },
    populate: roomBookingPopulate,
  });

// Create Booking
export const createBooking = asyncHandler(async (req, res, next) => {
  const {
    roomId,
    checkInDate,
    checkOutDate,
    guests,
    paymentMethod,
    specialRequests,
  } = req.body;

  const { item } = await prepareRoomBookingQuote({
    roomId,
    checkInDate,
    checkOutDate,
    guests,
  });

  const booking = await dbService.create({
    model: UserBooking,
    data: {
      user: req.user._id,
      room: roomId,
      checkInDate: item.checkInDate,
      checkOutDate: item.checkOutDate,
      nights: item.nights,
      pricePerNight: item.pricePerNight,
      totalPrice: item.totalPrice,
      guests: item.guests,
      status: "pending",
      paymentStatus: "unpaid",
      paymentMethod: paymentMethod || "cash",
      specialRequests,
    },
  });

  const populatedBooking = await loadBookingWithRelations(booking._id);

  emitBookingRealtimeUpdate({
    resource: "room",
    action: "created",
    userId: req.user._id,
    bookingId: booking._id,
    source: "website",
  });

  await appendBookingAudit({
    entityType: "room_booking",
    entityId: booking._id,
    action: "created",
    actorId: req.user._id,
    after: { status: booking.status, roomId: String(roomId) },
  });

  return successResponse({
    res,
    status: 201,
    data: populatedBooking || booking,
    message: "Booking created successfully",
  });
});

export const findActiveStayForUser = async (userId) => {
  const now = new Date();
  return UserBooking.findOne({
    user: userId,
    status: { $in: ["confirmed", "checked-in"] },
    checkInDate: { $lte: now },
    checkOutDate: { $gt: now },
  })
    .populate("room", "roomName roomNumber roomType")
    .sort({ checkInDate: -1 });
};

export const getMyActiveStay = asyncHandler(async (req, res) => {
  const stay = await findActiveStayForUser(req.user._id);

  if (!stay) {
    return successResponse({
      res,
      data: { stay: null },
      message: "No active stay found",
    });
  }

  const room = stay.room;
  return successResponse({
    res,
    data: {
      stay: {
        bookingId: stay._id,
        checkInDate: stay.checkInDate,
        checkOutDate: stay.checkOutDate,
        status: stay.status,
        roomNumber: room?.roomNumber ?? null,
        roomName: room?.roomName ?? null,
      },
    },
    message: "Active stay retrieved",
  });
});

// Get My Bookings
export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await dbService.findAll({
    model: UserBooking,
    filter: { user: req.user._id },
    populate: [{ path: "room", select: "roomName roomNumber roomType price roomImages" }],
    sort: "-createdAt",
  });

  return successResponse({
    res,
    data: bookings,
    message: "Bookings retrieved successfully",
  });
});

// Get Booking By ID
export const getBookingById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const booking = await dbService.findOne({
    model: UserBooking,
    filter: { _id: id },
    populate: [
      { path: "room", select: "roomName roomNumber roomType price roomImages" },
      { path: "user", select: "userName email" },
    ],
  });

  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

  return successResponse({
    res,
    data: booking,
    message: "Booking retrieved successfully",
  });
});

// Public room availability
export const getRoomAvailability = asyncHandler(async (req, res, next) => {
  const { roomId } = req.params;
  const { checkInDate, checkOutDate } = req.query;

  const room = await dbService.findOne({
    model: RoomModel,
    filter: { _id: roomId },
    select: "capacity roomName roomNumber isAvailable checkInTime checkOutTime",
  });

  if (!room) {
    return next(new Error("Room not found", { cause: 404 }));
  }

  const blockedRanges = await getUnavailableRangesForRoom({ roomId });

  let isBookable = room.isAvailable;

  if (checkInDate && checkOutDate) {
    const parsedWindow = parseBookingWindow({ checkInDate, checkOutDate });
    const hasConflict = blockedRanges.some((range) =>
      dateRangesOverlap(
        range.checkInDate,
        range.checkOutDate,
        parsedWindow.checkInDate,
        parsedWindow.checkOutDate,
      ),
    );

    isBookable = room.isAvailable && !hasConflict;
  }

  return successResponse({
    res,
    data: {
      roomId,
      roomName: room.roomName,
      roomNumber: room.roomNumber,
      isBookable,
      isVisible: room.isAvailable,
      checkInTime: room.checkInTime,
      checkOutTime: room.checkOutTime,
      bookedRanges: blockedRanges.map((range) => ({
        checkInDate: range.checkInDate,
        checkOutDate: range.checkOutDate,
        status: range.status,
      })),
    },
    message: "Room availability retrieved successfully",
  });
});

// Cancel Booking
export const cancelBooking = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const booking = await dbService.findOne({
    model: UserBooking,
    filter: { _id: id, user: req.user._id },
  });

  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

  if (booking.status === "completed") {
    return next(new Error("Cannot cancel a completed booking", { cause: 400 }));
  }

  if (booking.paymentStatus === "paid") {
    return next(new Error("Paid bookings cannot be cancelled from your account", { cause: 400 }));
  }

  booking.status = "cancelled";
  await booking.save();

  emitBookingRealtimeUpdate({
    resource: "room",
    action: "cancelled",
    userId: booking.user,
    bookingId: booking._id,
    source: "website",
  });

  return successResponse({
    res,
    message: "Booking cancelled successfully",
  });
});

// Update Booking
export const updateBooking = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    guests,
    specialRequests,
    paymentMethod,
    status,
    paymentStatus,
    cancellationReason,
  } = req.body;

  const booking = await dbService.findOne({
    model: UserBooking,
    filter:
      req.user.role === roleTypes.admin
        ? { _id: id }
        : { _id: id, user: req.user._id },
    populate: [{ path: "room", select: "capacity" }],
  });

  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

  const isAdmin = req.user.role === roleTypes.admin;

  if (!isAdmin) {
    if (booking.status !== "pending") {
      return next(
        new Error("Only pending bookings can be updated", { cause: 400 }),
      );
    }

    if (new Date() >= new Date(booking.checkInDate)) {
      return next(
        new Error("Cannot update booking after check-in date", { cause: 400 }),
      );
    }

    if (guests && guests > booking.room.capacity) {
      return next(new Error("Guests exceed room capacity", { cause: 400 }));
    }
  }

  if (guests) booking.guests = guests;
  if (specialRequests !== undefined) booking.specialRequests = specialRequests;
  if (paymentMethod) booking.paymentMethod = paymentMethod;
  if (isAdmin && status) booking.status = status;
  if (isAdmin && paymentStatus) booking.paymentStatus = paymentStatus;
  if (isAdmin && cancellationReason !== undefined) {
    booking.cancellationReason = cancellationReason;
  }

  await booking.save();

  const populatedBooking = await loadBookingWithRelations(booking._id);

  emitBookingRealtimeUpdate({
    resource: "room",
    action: "updated",
    userId: booking.user,
    bookingId: booking._id,
    source: isAdmin ? "dashboard" : "website",
  });

  return successResponse({
    res,
    data: populatedBooking || booking,
    message: "Booking updated successfully",
  });
});

// Admin: Get All Bookings
export const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await dbService.findAll({
    model: UserBooking,
    populate: roomBookingPopulate,
    sort: "-createdAt",
  });

  return successResponse({
    res,
    data: bookings,
    message: "All bookings retrieved successfully",
  });
});
