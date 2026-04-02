import { activityModel } from "../../../DB/Model/Activity.model.js";
import { activityScheduleModel } from "../../../DB/Model/ActivitySchedule.model.js";
import * as dbService from "../../../DB/db.service.js";
import { paginate } from "../../../utils/pagination/pagination.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseNullableNumber = (value) => {
  if (value === "" || value === null) return null;
  return parseNumber(value);
};

const normalizeScheduleForResponse = (schedule) => {
  const item = schedule.toObject ? schedule.toObject() : schedule;
  const activity = item.activity && typeof item.activity === "object" ? item.activity : null;
  const activityData = activity
    ? {
        id: activity._id,
        title: activity.title,
        label: activity.label,
        category: activity.category,
        image: activity.image,
        basePrice: activity.basePrice,
        pricingType: activity.pricingType,
        location: activity.location,
      }
    : null;

  return {
    ...item,
    activity: activityData,
    resolvedPrice: item.priceOverride ?? activityData?.basePrice ?? 0,
  };
};

const ensureActivityExists = async (activityId) => {
  const activity = await dbService.findOne({
    model: activityModel,
    filter: { _id: activityId },
  });

  return activity;
};

export const createSchedule = asyncHandler(async (req, res, next) => {
  const activity = await ensureActivityExists(req.params.activityId);
  if (!activity) {
    return next(new Error("Activity not found", { cause: 404 }));
  }

  const capacity = parseNumber(req.body.capacity);
  const availableSeats = parseNumber(req.body.availableSeats);
  const priceOverride = parseNullableNumber(req.body.priceOverride);

  if (availableSeats !== undefined && availableSeats > capacity) {
    return next(new Error("Available seats cannot exceed capacity", { cause: 400 }));
  }

  const schedule = await dbService.create({
    model: activityScheduleModel,
    data: {
      activity: activity._id,
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      capacity,
      availableSeats,
      priceOverride,
      status: req.body.status,
      notes: req.body.notes,
      createdBy: req.user?._id,
    },
  });

  const populatedSchedule = await activityScheduleModel
    .findById(schedule._id)
    .populate("activity", "title label category image basePrice pricingType location");

  return successResponse({
    res,
    status: 201,
    message: "Activity schedule created successfully",
    data: { schedule: normalizeScheduleForResponse(populatedSchedule) },
  });
});

export const getSchedulesByActivity = asyncHandler(async (req, res, next) => {
  const activity = await ensureActivityExists(req.params.activityId);
  if (!activity) {
    return next(new Error("Activity not found", { cause: 404 }));
  }

  const schedules = await activityScheduleModel
    .find({ activity: req.params.activityId })
    .sort({ date: 1, startTime: 1 })
    .populate("activity", "title label category image basePrice pricingType location");

  return successResponse({
    res,
    data: { schedules: schedules.map(normalizeScheduleForResponse) },
  });
});

export const getAllSchedules = asyncHandler(async (req, res) => {
  const { activity, status, search, sort, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (activity) filter.activity = activity;
  if (status) filter.status = status;

  if (search) {
    const matchingActivities = await activityModel
      .find({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { label: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
        ],
      })
      .select("_id");

    filter.activity = { $in: matchingActivities.map((item) => item._id) };
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    date_asc: { date: 1, startTime: 1 },
    date_desc: { date: -1, startTime: -1 },
  };
  const result = await paginate({
    page: Number(page) || 1,
    size: Number(limit) || 10,
    model: activityScheduleModel,
    filter,
    populate: [
      {
        path: "activity",
        select: "title label category image basePrice pricingType location",
      },
    ],
    sort: sortOptions[sort] || { date: 1, startTime: 1 },
  });

  return successResponse({
    res,
    data: {
      schedules: result.data.map(normalizeScheduleForResponse),
      pagination: {
        total: result.count,
        page: result.page,
        limit: result.size,
        totalPages: Math.ceil(result.count / result.size),
      },
    },
  });
});

export const getScheduleById = asyncHandler(async (req, res, next) => {
  const schedule = await activityScheduleModel
    .findById(req.params.id)
    .populate("activity", "title label category image basePrice pricingType location");

  if (!schedule) {
    return next(new Error("Activity schedule not found", { cause: 404 }));
  }

  return successResponse({
    res,
    data: { schedule: normalizeScheduleForResponse(schedule) },
  });
});

export const updateSchedule = asyncHandler(async (req, res, next) => {
  const existing = await activityScheduleModel.findById(req.params.id);
  if (!existing) {
    return next(new Error("Activity schedule not found", { cause: 404 }));
  }

  const capacity = parseNumber(req.body.capacity);
  const availableSeats = parseNumber(req.body.availableSeats);
  const nextCapacity = capacity ?? existing.capacity;
  const nextAvailableSeats = availableSeats ?? existing.availableSeats;

  if (nextAvailableSeats > nextCapacity) {
    return next(new Error("Available seats cannot exceed capacity", { cause: 400 }));
  }

  const updateData = {};
  if (req.body.date) updateData.date = req.body.date;
  if (req.body.startTime) updateData.startTime = req.body.startTime;
  if (req.body.endTime) updateData.endTime = req.body.endTime;
  if (capacity !== undefined) updateData.capacity = capacity;
  if (availableSeats !== undefined) updateData.availableSeats = availableSeats;
  if (req.body.priceOverride !== undefined) {
    updateData.priceOverride = parseNullableNumber(req.body.priceOverride);
  }
  if (req.body.status) updateData.status = req.body.status;
  if (req.body.notes !== undefined) updateData.notes = req.body.notes;

  if (!updateData.status && nextAvailableSeats === 0) {
    updateData.status = "full";
  }

  const schedule = await activityScheduleModel
    .findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
    .populate("activity", "title label category image basePrice pricingType location");

  return successResponse({
    res,
    message: "Activity schedule updated successfully",
    data: { schedule: normalizeScheduleForResponse(schedule) },
  });
});

export const deleteSchedule = asyncHandler(async (req, res, next) => {
  const schedule = await activityScheduleModel
    .findByIdAndDelete(req.params.id)
    .populate("activity", "title label category image basePrice pricingType location");

  if (!schedule) {
    return next(new Error("Activity schedule not found", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "Activity schedule deleted successfully",
    data: { schedule: normalizeScheduleForResponse(schedule) },
  });
});
