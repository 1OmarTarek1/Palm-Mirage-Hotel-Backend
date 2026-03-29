import Joi from "joi";

// Reusable ObjectId validation
const objectId = Joi.string().hex().length(24);

// Create Booking
export const createBookingSchema = {
  body: Joi.object({
    roomId: objectId.required(),

    checkInDate: Joi.date()
      .min("now")
      .required()
      .messages({
        "date.base": "Check-in date must be a valid date",
        "date.min": "Check-in date cannot be in the past",
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
  }),
};

// Update Booking
export const updateBookingSchema = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
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
  }).min(1).messages({   // at least one field must be sent
    "object.min": "At least one field must be provided to update",
  }),
};

// Get Booking By ID
export const getBookingByIdSchema = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

// Cancel Booking
export const cancelBookingSchema = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

// Admin - Get All Bookings 
export const getAllBookingsSchema = {
  query: Joi.object({
    page: Joi.number().min(1).default(1),

    size: Joi.number().min(1).max(100).default(10),

    status: Joi.string()
      .valid("pending", "confirmed", "cancelled", "completed")
      .optional(),

    paymentStatus: Joi.string()
      .valid("unpaid", "paid", "refunded")
      .optional(),

    fromDate: Joi.date().optional(),

    toDate: Joi.date()
      .greater(Joi.ref("fromDate"))
      .optional(),
  }),
};