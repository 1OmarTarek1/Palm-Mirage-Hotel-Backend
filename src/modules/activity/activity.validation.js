import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { allowedIcons, allowedCategories } from "../../DB/Model/Activity.model.js";

const statSchema = joi.object({
  value: joi.string().required(),
  label: joi.string().required(),
});

const statFieldSchema = joi.alternatives().try(
  joi.array().items(statSchema).max(10),
  joi.string()
);

const highlightsFieldSchema = joi.alternatives().try(
  joi.array().items(joi.string().trim()).max(20),
  joi.string()
);

export const createActivity = joi
  .object()
  .keys({
    category: joi
      .string()
      .valid(...allowedCategories)
      .required(),
    label: joi.string().min(2).max(100).trim().required(),
    title: joi.string().min(2).max(200).trim().required(),
    description: joi.string().trim().required(),
    stats: statFieldSchema.optional(),
    highlights: highlightsFieldSchema.optional(),
    icon: joi
      .string()
      .valid(...allowedIcons)
      .optional(),
    file: joi.array().items(generalFields.file).optional(),
  })
  .required();
export const updateActivity = joi
  .object()
  .keys({
    id: generalFields.id.required(),
    category: joi.string().valid(...allowedCategories),
    label: joi.string().min(2).max(100).trim(),
    title: joi.string().min(2).max(200).trim(),
    description: joi.string().trim(),
    stats: statFieldSchema,
    highlights: highlightsFieldSchema,
    icon: joi.string().valid(...allowedIcons),
    file: generalFields.file.optional(),
  })
  .required();

export const paramId = joi
  .object()
  .keys({
    id: generalFields.id.required(),
  })
  .required();

export const queryFilter = joi
  .object()
  .keys({
    category: joi.string().valid(...allowedCategories),
    search: joi.string().trim().max(200).allow(""),
    icon: joi.string().valid(...allowedIcons),
    sort: joi.string().valid("newest", "oldest", "title_asc", "title_desc"),
    page: joi.number().integer().min(1),
    limit: joi.number().integer().min(1).max(100),
  })
  .required();
