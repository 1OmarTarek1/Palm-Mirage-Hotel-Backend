import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { allowedIcons } from "../../DB/Model/ActivityCategory.model.js";

export const createCategory = joi
  .object()
  .keys({
    label: joi.string().min(2).max(100).trim().required(),
    icon: joi.string().valid(...allowedIcons).required(),
  })
  .required();

export const updateCategory = joi
  .object()
  .keys({
    id: generalFields.id.required(),
    label: joi.string().min(2).max(100).trim(),
    icon: joi.string().valid(...allowedIcons),
  })
  .required();

export const paramId = joi
  .object()
  .keys({
    id: generalFields.id.required(),
  })
  .required();
