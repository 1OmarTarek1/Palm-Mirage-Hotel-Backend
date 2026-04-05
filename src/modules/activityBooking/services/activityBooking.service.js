import { activityBookingModel } from "../../../DB/Model/ActivityBooking.model.js";
import { activityModel } from "../../../DB/Model/Activity.model.js";
import { activityScheduleModel } from "../../../DB/Model/ActivitySchedule.model.js";
import * as dbService from "../../../DB/db.service.js";
import { paginate } from "../../../utils/pagination/pagination.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { emitBookingRealtimeUpdate } from "../../../socket/bookingRealtime.js";
import { appendBookingAudit } from "../../../utils/bookingAuditLog.util.js";

const blockingBookingStatuses = ["pending", "awaiting_payment", "confirmed", "completed"];

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
  if (!booking.seatsCommitted) return;

  await activityScheduleModel.findByIdAndUpdate(booking.schedule, {
    $inc: { availableSeats: booking.guests },
    $set: { status: "scheduled" },
  });
  booking.seatsCommitted = false;
};

export const commitActivitySeats = async (booking) => {
  const updated = await activityScheduleModel.findOneAndUpdate(
    { _id: booking.schedule, availableSeats: { $gte: booking.guests } },
    { $inc: { availableSeats: -booking.guests } },
    { new: true }
  );

  if (!updated) {
    return { ok: false, reason: "Not enough seats available" };
  }

  const nextStatus = updated.availableSeats === 0 ? "full" : "scheduled";
  await activityScheduleModel.findByIdAndUpdate(updated._id, { $set: { status: nextStatus } });

  await activityBookingModel.findByIdAndUpdate(booking._id, { seatsCommitted: true });
  booking.seatsCommitted = true;
  return { ok: true };
};

export const createBooking = asyncHandler(async (req, res, next) => {
  const { scheduleId, guests, contactPhone, notes, paymentMethod = "cash" } = req.body;

  const schedule = await activityScheduleModel.findById(scheduleId).populate(
    "activity",
    "title label category image basePrice pricingType location isActive"
  );

  if (!schedule) {
    return next(new Error("Activity schedule not found", { cause: 404 }));
  }

  const existingBooking = await activityBookingModel.findOne({
    user: req.user._id,
    schedule: schedule._id,
    status: { $in: blockingBookingStatuses },
  });

  if (existingBooking) {
    return next(new Error("You already booked this activity session", { cause: 409 }));
  }

  if (!schedule.activity || !schedule.activity.isActive) {
    return next(new Error("Activity is not available for booking", { cause: 400 }));
  }

  if (schedule.status === "cancelled" || schedule.status === "completed") {
    return next(new Error("This activity session is not bookable", { cause: 400 }));
  }

  if (paymentMethod === "card") {
    if (schedule.availableSeats < Number(guests)) {
      return next(new Error("Not enough seats available for this session", { cause: 400 }));
    }
  } else {
    if (schedule.availableSeats < Number(guests)) {
      return next(new Error("Not enough seats available for this session", { cause: 400 }));
    }
  }

  const unitPrice = schedule.priceOverride ?? schedule.activity.basePrice ?? 0;
  const pricingType = schedule.activity.pricingType ?? "per_person";
  const totalPrice = pricingType === "per_group" ? unitPrice : unitPrice * Number(guests);

  const status = paymentMethod === "card" ? "awaiting_payment" : "pending";

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
      status,
      paymentMethod,
      paymentStatus: "unpaid",
      seatsCommitted: false,
    },
  });

  const populatedBooking = await activityBookingModel
    .findById(booking._id)
    .populate(bookingPopulate);

  await appendBookingAudit({
    entityType: "activity_booking",
    entityId: booking._id,
    action: "created",
    actorId: req.user._id,
    after: { status, paymentMethod, scheduleId: String(schedule._id), guests: Number(guests) },
  });

  const notifTitle =
    paymentMethod === "card"
      ? "Complete payment"
      : "Activity request submitted";
  const notifMessage =
    paymentMethod === "card"
      ? "Complete card payment to confirm your activity booking."
      : "Your activity booking is pending staff approval.";

  emitBookingRealtimeUpdate({
    resource: "activity",
    action: "created",
    userId: req.user._id,
    bookingId: booking._id,
    source: "website",
    title: notifTitle,
    message: notifMessage,
    severity: paymentMethod === "card" ? "info" : "info",
  });

  return successResponse({
    res,
    status: 201,
    message:
      paymentMethod === "card"
        ? "Proceed to payment to confirm your booking"
        : "Activity booking submitted for approval",
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

  const sortBy = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
  const result = await paginate({
    page: Number(page) || 1,
    size: Number(limit) || 20,
    model: activityBookingModel,
    filter,
    populate: bookingPopulate,
    sort: sortBy,
  });

  return successResponse({
    res,
    data: {
      bookings: result.data.map(normalizeBooking),
      pagination: {
        total: result.count,
        page: result.page,
        limit: result.size,
        totalPages: Math.ceil(result.count / result.size),
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
  const nextStatus = req.body.status;

  if (["cancelled", "rejected"].includes(nextStatus) && booking.seatsCommitted) {
    await restoreSeatsIfNeeded(booking);
  }

  if (nextStatus === "confirmed" && ["pending", "awaiting_payment"].includes(previousStatus)) {
    const commit = await commitActivitySeats(booking);
    if (!commit.ok) {
      return next(new Error(commit.reason || "Cannot confirm booking", { cause: 400 }));
    }
  }

  booking.status = nextStatus;
  if (req.body.paymentStatus !== undefined) {
    booking.paymentStatus = req.body.paymentStatus;
  }

  if (req.body.cancellationReason !== undefined) {
    booking.cancellationReason = req.body.cancellationReason;
  }

  await booking.save();

  const populatedBooking = await activityBookingModel
    .findById(booking._id)
    .populate(bookingPopulate);

  await appendBookingAudit({
    entityType: "activity_booking",
    entityId: booking._id,
    action: "status_updated",
    actorId: req.user._id,
    before: { status: previousStatus, paymentStatus: booking.paymentStatus },
    after: { status: booking.status, paymentStatus: populatedBooking.paymentStatus },
  });

  emitBookingRealtimeUpdate({
    resource: "activity",
    action: "updated",
    userId: booking.user,
    bookingId: booking._id,
    source: "dashboard",
    title: "Activity booking updated",
    message: `Your activity booking is now ${booking.status}.`,
    severity: booking.status === "rejected" ? "warning" : "success",
  });

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

  if (booking.paymentStatus === "paid" && booking.status === "confirmed") {
    return next(new Error("Paid bookings cannot be cancelled from your account", { cause: 400 }));
  }

  await restoreSeatsIfNeeded(booking);
  booking.status = "cancelled";
  booking.cancellationReason = req.body.cancellationReason ?? "";
  await booking.save();

  const populatedBooking = await activityBookingModel
    .findById(booking._id)
    .populate(bookingPopulate);

  await appendBookingAudit({
    entityType: "activity_booking",
    entityId: booking._id,
    action: "cancelled_by_user",
    actorId: req.user._id,
    after: { status: "cancelled" },
  });

  emitBookingRealtimeUpdate({
    resource: "activity",
    action: "cancelled",
    userId: booking.user,
    bookingId: booking._id,
    source: "website",
    title: "Activity booking cancelled",
    message: "Your activity booking was cancelled.",
    severity: "info",
  });

  return successResponse({
    res,
    message: "Activity booking cancelled successfully",
    data: { booking: normalizeBooking(populatedBooking) },
  });
});

export const fulfillActivityBookingAfterStripe = async ({ bookingId, checkoutSessionId }) => {
  const booking = await activityBookingModel.findById(bookingId);
  if (!booking || booking.status !== "awaiting_payment") {
    return { ok: false, reason: "invalid_state" };
  }

  const commit = await commitActivitySeats(booking);
  if (!commit.ok) {
    return commit;
  }

  await activityBookingModel.findByIdAndUpdate(bookingId, {
    status: "confirmed",
    paymentStatus: "paid",
    checkoutSession: checkoutSessionId,
  });

  await appendBookingAudit({
    entityType: "activity_booking",
    entityId: bookingId,
    action: "paid_stripe",
    actorId: null,
    metadata: { checkoutSessionId: String(checkoutSessionId) },
  });

  return { ok: true, userId: booking.user };
};

export const cancelActivityBookingAwaitingPayment = async (bookingId, reason = "payment_expired") => {
  const booking = await activityBookingModel.findById(bookingId);
  if (!booking || booking.status !== "awaiting_payment") {
    return { ok: false };
  }

  await activityBookingModel.findByIdAndUpdate(bookingId, {
    status: "cancelled",
    cancellationReason: reason,
  });

  await appendBookingAudit({
    entityType: "activity_booking",
    entityId: bookingId,
    action: "cancelled_payment_timeout",
    metadata: { reason },
  });

  return { ok: true, userId: booking.user };
};
