import Joi from 'joi';

export const createBooking = Joi.object({
  number: Joi.number(),
  date: Joi.date().required(),
  time: Joi.string()
    .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/)
    .required(),
  guests: Joi.number().integer().min(1).required(),
});


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
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').required(),
}).required();
