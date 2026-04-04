import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { UserBooking } from "../../../DB/Model/UserBooking.model.js";
import { RoomModel } from "../../../DB/Model/Room.model.js";
import { successResponse } from "../../../utils/response/success.response.js";

const normalizeDateOnly = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
};

// Create Booking
export const createBooking = asyncHandler(async (req, res, next) => {
  const {
    roomId,
    checkInDate,
    checkOutDate,
    guests,
    paymentMethod,
    paymentStatus,
    specialRequests,
  } = req.body;

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (checkIn >= checkOut) {
    return next(new Error("Invalid booking dates", { cause: 400 }));
  }

  const room = await dbService.findOne({
    model: RoomModel,
    filter: { _id: roomId },
  });

  if (!room) {
    return next(new Error("Room not found", { cause: 404 }));
  }

  if (guests > room.capacity) {
    return next(new Error("Guests exceed room capacity", { cause: 400 }));
  }

  const existingBookings = await dbService.findAll({
    model: UserBooking,
    filter: {
      room: roomId,
      status: { $in: ["pending", "confirmed"] },
    },
    select: "checkInDate checkOutDate",
  });

  const normalizedCheckIn = normalizeDateOnly(checkIn);
  const normalizedCheckOut = normalizeDateOnly(checkOut);

  const conflict = existingBookings.find((booking) => {
    const bookingCheckIn = normalizeDateOnly(booking.checkInDate);
    const bookingCheckOut = normalizeDateOnly(booking.checkOutDate);

    return bookingCheckIn < normalizedCheckOut && bookingCheckOut > normalizedCheckIn;
  });

  if (conflict) {
    return next(
      new Error("Room already booked for selected dates", { cause: 400 }),
    );
  }

  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  const pricePerNight = room.price - (room.discount || 0);
  const totalPrice = nights * pricePerNight;

  const booking = await dbService.create({
    model: UserBooking,
    data: {
      user: req.user._id,
      room: roomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      pricePerNight,
      totalPrice,
      guests,
      status: "pending",
      paymentStatus: paymentStatus || "unpaid",
      paymentMethod,
      specialRequests,
    },
  });

  return successResponse({
    res,
    statusCode: 201,
    data: booking,
    message: "Booking created successfully",
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

  const bookedRanges = await dbService.findAll({
    model: UserBooking,
    filter: {
      room: roomId,
      status: { $in: ["pending", "confirmed", "checked-in"] },
    },
    select: "checkInDate checkOutDate status",
    sort: "checkInDate",
  });

  let isBookable = true;

  if (checkInDate && checkOutDate) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (!(checkIn < checkOut)) {
      return next(new Error("Invalid availability date range", { cause: 400 }));
    }

    const normalizedCheckIn = normalizeDateOnly(checkIn);
    const normalizedCheckOut = normalizeDateOnly(checkOut);

    const hasConflict = bookedRanges.some((booking) => {
      const bookingCheckIn = normalizeDateOnly(booking.checkInDate);
      const bookingCheckOut = normalizeDateOnly(booking.checkOutDate);

      return (
        bookingCheckIn < normalizedCheckOut &&
        bookingCheckOut > normalizedCheckIn
      );
    });

    isBookable = !hasConflict;
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
      bookedRanges: bookedRanges.map((booking) => ({
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        status: booking.status,
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

  booking.status = "cancelled";
  await booking.save();

  return successResponse({
    res,
    message: "Booking cancelled successfully",
  });
});

// Update Booking
export const updateBooking = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { guests, specialRequests, paymentMethod } = req.body;

  const booking = await dbService.findOne({
    model: UserBooking,
    filter: { _id: id, user: req.user._id },
    populate: [{ path: "room", select: "capacity" }],
  });

  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

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

  if (guests) booking.guests = guests;
  if (specialRequests !== undefined) booking.specialRequests = specialRequests;
  if (paymentMethod) booking.paymentMethod = paymentMethod;

  await booking.save();

  return successResponse({
    res,
    data: booking,
    message: "Booking updated successfully",
  });
});

// Admin: Get All Bookings
export const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await dbService.findAll({
    model: UserBooking,
    populate: [
      { path: "room", select: "roomName roomNumber roomType price roomImages" },
      { path: "user", select: "userName email" },
    ],
    sort: "-createdAt",
  });

  return successResponse({
    res,
    data: bookings,
    message: "All bookings retrieved successfully",
  });
});
