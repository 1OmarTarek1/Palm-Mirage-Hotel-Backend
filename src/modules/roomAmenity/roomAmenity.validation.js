import Joi from "joi";

export const createRoomAmenityValidation = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  icon: Joi.string().allow("").optional(),
  description: Joi.string().allow("").optional(),
});

export const updateRoomAmenityValidation = Joi.object({
  name: Joi.string().min(2).max(80).optional(),
  icon: Joi.string().allow("").optional(),
  description: Joi.string().allow("").optional(),
}).min(1);
