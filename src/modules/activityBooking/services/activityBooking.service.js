import { activityBookingModel } from "../../../DB/Model/ActivityBooking.model.js";
import { activityModel } from "../../../DB/Model/Activity.model.js";
import { activityScheduleModel } from "../../../DB/Model/ActivitySchedule.model.js";
import * as dbService from "../../../DB/db.service.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";

const activeBookingStatuses = ["pending", "confirmed", "completed"];

const bookingPopulate = [
  {
    path: "activity",
    select: "title label category image basePrice pricingType location",
  },
  {
    path: "schedule",
    select: "date startTime endTime capacity availableSeats priceOverride status",
  },
  {
    path: "user",
    select: "userName email phoneNumber",
  },
];

const normalizeBooking = (booking) => {
  const item = booking.toObject ? booking.toObject() : booking;
  return {
    ...item,
    activity: item.activity
      ? {
          id: item.activity._id,
          title: item.activity.title,
          label: item.activity.label,
          category: item.activity.category,
          image: item.activity.image,
          basePrice: item.activity.basePrice,
          pricingType: item.activity.pricingType,
          location: item.activity.location,
        }
      : null,
    schedule: item.schedule
      ? {
          id: item.schedule._id,
          date: item.schedule.date,
          startTime: item.schedule.startTime,
          endTime: item.schedule.endTime,
          capacity: item.schedule.capacity,
          availableSeats: item.schedule.availableSeats,
          priceOverride: item.schedule.priceOverride,
          status: item.schedule.status,
        }
      : null,
    user: item.user
      ? {
          id: item.user._id,
          userName: item.user.userName,
          email: item.user.email,
          phoneNumber: item.user.phoneNumber,
        }
      : null,
  };
};

const restoreSeatsIfNeeded = async (booking) => {
  if (!activeBookingStatuses.includes(booking.status)) return;

  await activityScheduleModel.findByIdAndUpdate(booking.schedule, {
    $inc: { availableSeats: booking.guests },
    $set: { status: "scheduled" },
  });
};

export const createBooking = asyncHandler(async (req, res, next) => {
  const { scheduleId, guests, contactPhone, notes } = req.body;

  const schedule = await activityScheduleModel.findById(scheduleId).populate(
    "activity",
    "title label category image basePrice pricingType location isActive"
  );

  if (!schedule) {
    return next(new Error("Activity schedule not found", { cause: 404 }));
  }

  if (!schedule.activity || !schedule.activity.isActive) {
    return next(new Error("Activity is not available for booking", { cause: 400 }));
  }

  if (schedule.status === "cancelled" || schedule.status === "completed") {
    return next(new Error("This activity session is not bookable", { cause: 400 }));
  }

  if (schedule.availableSeats < Number(guests)) {
    return next(new Error("Not enough seats available for this session", { cause: 400 }));
  }

  const unitPrice = schedule.priceOverride ?? schedule.activity.basePrice ?? 0;
  const pricingType = schedule.activity.pricingType ?? "per_person";
  const totalPrice = pricingType === "per_group" ? unitPrice : unitPrice * Number(guests);

  const booking = await dbService.create({
    model: activityBookingModel,
    data: {
      user: req.user._id,
      activity: schedule.activity._id,
      schedule: schedule._id,
      guests: Number(guests),
      unitPrice,
      totalPrice,
      pricingType,
      bookingDate: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      contactPhone,
      notes,
    },
  });

  const nextAvailableSeats = schedule.availableSeats - Number(guests);
  await activityScheduleModel.findByIdAndUpdate(schedule._id, {
    $inc: { availableSeats: -Number(guests) },
    $set: { status: nextAvailableSeats === 0 ? "full" : schedule.status },
  });

  const populatedBooking = await activityBookingModel
    .findById(booking._id)
    .populate(bookingPopulate);

  return successResponse({
    res,
    status: 201,
    message: "Activity booking created successfully",
    data: { booking: normalizeBooking(populatedBooking) },
  });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await activityBookingModel
    .find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate(bookingPopulate);

  return successResponse({
    res,
    data: { bookings: bookings.map(normalizeBooking) },
  });
});

export const getAllBookings = asyncHandler(async (req, res) => {
  const { status, paymentStatus, search, page = 1, limit = 20, sort } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  if (search) {
    const matchingActivities = await activityModel
      .find({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { label: { $regex: search, $options: "i" } },
        ],
      })
      .select("_id");

    filter.$or = [
      { activity: { $in: matchingActivities.map((item) => item._id) } },
      { contactPhone: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sortBy = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

  const [bookings, total] = await Promise.all([
    activityBookingModel
      .find(filter)
      .sort(sortBy)
      .skip(skip)
      .limit(Number(limit))
      .populate(bookingPopulate),
    activityBookingModel.countDocuments(filter),
  ]);

  return successResponse({
    res,
    data: {
      bookings: bookings.map(normalizeBooking),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

export const getBookingById = asyncHandler(async (req, res, next) => {
  const booking = await activityBookingModel.findById(req.params.id).populate(bookingPopulate);

  if (!booking) {
    return next(new Error("Activity booking not found", { cause: 404 }));
  }

  if (
    req.user &&
    req.user.role !== "admin" &&
    String(booking.user?._id ?? booking.user) !== String(req.user._id)
  ) {
    return next(new Error("Not Authorization Account ", { cause: 403 }));
  }

  return successResponse({
    res,
    data: { booking: normalizeBooking(booking) },
  });
});

export const updateBookingStatus = asyncHandler(async (req, res, next) => {
  const booking = await activityBookingModel.findById(req.params.id);

  if (!booking) {
    return next(new Error("Activity booking not found", { cause: 404 }));
  }

  const previousStatus = booking.status;
  booking.status = req.body.status;

  if (req.body.paymentStatus) {
    booking.paymentStatus = req.body.paymentStatus;
  }

  if (req.body.cancellationReason !== undefined) {
    booking.cancellationReason = req.body.cancellationReason;
  }

  if (
    activeBookingStatuses.includes(previousStatus) &&
    ["cancelled", "rejected"].includes(booking.status)
  ) {
    await restoreSeatsIfNeeded(booking);
  }

  await booking.save();

  const populatedBooking = await activityBookingModel
    .findById(booking._id)
    .populate(bookingPopulate);

  return successResponse({
    res,
    message: "Activity booking updated successfully",
    data: { booking: normalizeBooking(populatedBooking) },
  });
});

export const cancelMyBooking = asyncHandler(async (req, res, next) => {
  const booking = await activityBookingModel.findById(req.params.id);

  if (!booking) {
    return next(new Error("Activity booking not found", { cause: 404 }));
  }

  if (String(booking.user) !== String(req.user._id)) {
    return next(new Error("Not Authorization Account ", { cause: 403 }));
  }

  if (["cancelled", "rejected"].includes(booking.status)) {
    return next(new Error("Booking is already inactive", { cause: 400 }));
  }

  await restoreSeatsIfNeeded(booking);
  booking.status = "cancelled";
  booking.cancellationReason = req.body.cancellationReason ?? "";
  await booking.save();

  const populatedBooking = await activityBookingModel
    .findById(booking._id)
    .populate(bookingPopulate);

  return successResponse({
    res,
    message: "Activity booking cancelled successfully",
    data: { booking: normalizeBooking(populatedBooking) },
  });
});
