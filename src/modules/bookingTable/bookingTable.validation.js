import Joi from "joi";
import {
  restaurantBookingModes,
  restaurantPaymentMethods,
} from "../../DB/Model/bookingTable.model.js";

const objectId = Joi.string().hex().length(24);

export const createBooking = Joi.object({
  bookingMode: Joi.string()
    .valid(...restaurantBookingModes)
    .default("table_only"),
  number: Joi.when("bookingMode", {
    is: "room_service",
    then: Joi.number().integer().min(1).optional(),
    otherwise: Joi.number().integer().min(1).required(),
  }),
  date: Joi.date().required(),
  time: Joi.string()
    .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/)
    .required(),
  guests: Joi.number().integer().min(1).required(),
  lineItems: Joi.array()
    .items(
      Joi.object({
        menuItemId: objectId.required(),
        qty: Joi.number().integer().min(1).required(),
      })
    )
    .default([]),
  paymentMethod: Joi.string()
    .valid(...restaurantPaymentMethods)
    .default("cash"),
  roomNumber: Joi.number().integer().min(1).optional(),
}).required();

export const getAvailableTables = Joi.object({
  date: Joi.date().required(),
  time: Joi.string()
    .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/)
    .required(),
  guests: Joi.number().integer().min(1).required(),
});

export const cancelBooking = Joi.object({
  number: Joi.number().required(),
}).required();

export const bookingIdParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
}).required();

export const updateBookingStatus = Joi.object({
  id: Joi.string().hex().length(24).required(),
  status: Joi.string()
    .valid("pending", "awaiting_payment", "confirmed", "cancelled", "completed")
    .required(),
  paymentStatus: Joi.string().valid("unpaid", "paid", "refunded").optional(),
}).required();
