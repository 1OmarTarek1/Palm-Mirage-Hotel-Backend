import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import {
  activityBookingPaymentStatuses,
  activityBookingStatuses,
} from "../../DB/Model/ActivityBooking.model.js";

export const createBooking = joi
  .object({
    scheduleId: generalFields.id.required(),
    guests: joi.number().integer().min(1).required(),
    contactPhone: generalFields.phone.required(),
    notes: joi.string().trim().max(500).allow(""),
  })
  .required();

export const bookingIdParam = joi
  .object({
    id: generalFields.id.required(),
  })
  .required();

export const updateBookingStatus = joi
  .object({
    id: generalFields.id.required(),
    status: joi
      .string()
      .valid(...activityBookingStatuses)
      .required(),
    paymentStatus: joi.string().valid(...activityBookingPaymentStatuses).optional(),
    cancellationReason: joi.string().trim().max(500).allow(""),
  })
  .required();

export const cancelBooking = joi
  .object({
    id: generalFields.id.required(),
    cancellationReason: joi.string().trim().max(500).allow(""),
  })
  .required();

export const queryFilter = joi
  .object({
    status: joi.string().valid(...activityBookingStatuses),
    paymentStatus: joi.string().valid(...activityBookingPaymentStatuses),
    search: joi.string().trim().max(200).allow(""),
    page: joi.number().integer().min(1),
    limit: joi.number().integer().min(1).max(100),
    sort: joi.string().valid("newest", "oldest"),
  })
  .required();
