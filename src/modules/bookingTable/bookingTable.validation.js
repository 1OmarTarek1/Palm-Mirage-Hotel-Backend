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
  time: Joi.string().valid('17:00', '19:00', '21:00').required(),
  guests: Joi.number().integer().min(1).required(),
});
