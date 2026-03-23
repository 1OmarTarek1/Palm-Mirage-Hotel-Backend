import Joi from 'joi';

export const createBooking = Joi.object({
  tableId: Joi.string().hex().length(24).optional(),
  date: Joi.date().required(),
  time: Joi.string().valid('17:00', '19:00', '21:00').required(),
  guests: Joi.number().integer().min(1).required(),
});

// export const createBookingAutoAssign = Joi.object({
//   date: Joi.date().required(),
//   time: Joi.string().valid('17:00', '19:00', '21:00').optional(),
//   guests: Joi.number().integer().min(1).required(),
// });

export const getAvailableTables = Joi.object({
  date: Joi.date().required(),
  time: Joi.string().valid('17:00', '19:00', '21:00').required(),
  guests: Joi.number().integer().min(1).required(),
});
