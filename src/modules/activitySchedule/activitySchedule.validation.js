import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { activityScheduleStatuses } from "../../DB/Model/ActivitySchedule.model.js";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createSchedule = joi
  .object({
    activityId: generalFields.id.required(),
    date: joi.date().iso().required(),
    startTime: joi.string().pattern(timePattern).required(),
    endTime: joi.string().pattern(timePattern).required(),
    capacity: joi.number().integer().min(1).required(),
    availableSeats: joi.number().integer().min(0).optional(),
    priceOverride: joi.number().min(0).allow(null, ""),
    status: joi.string().valid(...activityScheduleStatuses).optional(),
    notes: joi.string().trim().max(500).allow(""),
  })
  .required();

export const updateSchedule = joi
  .object({
    id: generalFields.id.required(),
    date: joi.date().iso(),
    startTime: joi.string().pattern(timePattern),
    endTime: joi.string().pattern(timePattern),
    capacity: joi.number().integer().min(1),
    availableSeats: joi.number().integer().min(0),
    priceOverride: joi.number().min(0).allow(null, ""),
    status: joi.string().valid(...activityScheduleStatuses),
    notes: joi.string().trim().max(500).allow(""),
  })
  .required();

export const scheduleIdParam = joi
  .object({
    id: generalFields.id.required(),
  })
  .required();

export const activitySchedulesParam = joi
  .object({
    activityId: generalFields.id.required(),
  })
  .required();

export const queryFilter = joi
  .object({
    activity: generalFields.id,
    status: joi.string().valid(...activityScheduleStatuses),
    search: joi.string().trim().max(200).allow(""),
    sort: joi.string().valid("newest", "oldest", "date_asc", "date_desc"),
    page: joi.number().integer().min(1),
    limit: joi.number().integer().min(1).max(100),
  })
  .required();
