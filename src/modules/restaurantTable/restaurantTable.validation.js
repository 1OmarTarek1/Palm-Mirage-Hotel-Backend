import Joi from 'joi';

export const createTable = Joi.object({
  number: Joi.number().integer().min(1).required(),
  chairs: Joi.number().integer().min(1).required(),
});


export const updateTable = Joi.object({
  number: Joi.number().integer().min(1),
  chairs: Joi.number().integer().min(1),
});

export const deleteTable = Joi.object({
  number: Joi.number().integer().min(1),
});

