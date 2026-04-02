import Joi from "joi";

export const createFacilityValidation = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  icon: Joi.string().uri().optional(),
  description: Joi.string().allow("").optional(),
});

export const updateFacilityValidation = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  icon: Joi.string().uri().optional(),
  description: Joi.string().allow("").optional(),
});