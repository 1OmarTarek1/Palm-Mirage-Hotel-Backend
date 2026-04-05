import Joi from "joi";

// Reusable ObjectId validation
const objectId = Joi.string().hex().length(24);

// Create Booking
export const createBookingSchema = Joi.object({
  roomId: objectId.required(),

  checkInDate: Joi.date()
    .required()
    .custom((value, helpers) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (value < today) {
        return helpers.message("Check-in date cannot be in the past");
      }
      return value;
    })
    .messages({
      "date.base": "Check-in date must be a valid date",
    }),

  checkOutDate: Joi.date()
    .greater(Joi.ref("checkInDate"))
    .required()
    .messages({
      "date.greater": "Check-out must be after check-in",
    }),

  guests: Joi.number()
    .integer()
    .min(1)
    .default(1),

  paymentMethod: Joi.string()
    .valid("cash", "card", "online")
    .optional(),

  specialRequests: Joi.string()
    .max(500)
    .trim()
    .optional(),
});

// Update Booking
export const updateBookingSchema = Joi.object({
  id: objectId.required(),
  guests: Joi.number()
    .integer()
    .min(1)
    .optional(),

  specialRequests: Joi.string()
    .max(500)
    .trim()
    .allow("")        // allow clearing the field
    .optional(),

  paymentMethod: Joi.string()
    .valid("cash", "card", "online")
    .optional(),

  status: Joi.string()
    .valid("pending", "confirmed", "checked-in", "completed", "cancelled", "no-show")
    .optional(),

  paymentStatus: Joi.string()
    .valid("unpaid", "paid", "refunded")
    .optional(),

  cancellationReason: Joi.string()
    .max(500)
    .trim()
    .allow("")
    .optional(),
}).min(1).messages({   // at least one field must be sent
  "object.min": "At least one field must be provided to update",
});

// Get Booking By ID
export const getBookingByIdSchema = Joi.object({
  id: objectId.required(),
});

// Public room availability
export const getRoomAvailabilitySchema = Joi.object({
  roomId: objectId.required(),
  checkInDate: Joi.date().optional(),
  checkOutDate: Joi.date().greater(Joi.ref("checkInDate")).optional(),
});

// Cancel Booking
export const cancelBookingSchema = Joi.object({
  id: objectId.required(),
});

// Admin - Get All Bookings 
export const getAllBookingsSchema = Joi.object({
  /** Omit room image URLs — smaller payload for dashboard aggregates */
  summary: Joi.string().valid("1").optional(),

  /** Compact server-side aggregates for the admin dashboard (ignores summary / list pagination) */
  dashboard: Joi.string().valid("1").optional(),

  /** UTC calendar day YYYY-MM-DD; should match dashboard client (e.g. new Date().toISOString().slice(0, 10)) */
  today: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  /** Comma-separated YYYY-MM-DD keys, oldest→newest (7 values), aligned with dashboard trend chart */
  weekKeys: Joi.string().max(120).optional(),

  page: Joi.number().min(1).default(1),

  size: Joi.number().min(1).max(100).default(10),

  status: Joi.string()
    .valid("pending", "confirmed", "checked-in", "completed", "cancelled", "no-show")
    .optional(),

  paymentStatus: Joi.string()
    .valid("unpaid", "paid", "refunded")
    .optional(),

  fromDate: Joi.date().optional(),

  toDate: Joi.date()
    .greater(Joi.ref("fromDate"))
    .optional(),
});
