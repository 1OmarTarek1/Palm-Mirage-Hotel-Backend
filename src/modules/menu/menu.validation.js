import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { allowedCategories } from "../../DB/Model/Menu.model.js";

/** Multer file shapes vary by storage; allow extras (e.g. buffer, stream) so PATCH uploads don't 400. */
const multerFileSchema = joi
  .object({
    fieldname: joi.string(),
    originalname: joi.string(),
    mimetype: joi.string(),
    path: joi.string().allow(""),
    size: joi.number().optional(),
  })
  .unknown(true);

const baseSchema = {
  name: joi.string().min(2).max(200).trim(),
  description: joi.string().trim().allow(""),
  price: joi.number().min(0),
  category: joi.string().valid(...allowedCategories),
  categoryIcon: joi.string().trim().max(80).allow(""),
  available: joi.boolean(),

  file: joi
    .object({
      image: joi.array().items(multerFileSchema).max(1).optional(),
      categoryHeroImg: joi.array().items(multerFileSchema).max(1).optional(),
    })
    .optional(),
};

// 1. Create Validation
export const createMenuItem = joi
  .object()
  .keys({
    ...baseSchema,
    name: baseSchema.name.required(),
    description: joi.string().trim().required().messages({
      "any.required": "Description is required",
      "string.empty": "Description cannot be empty",
    }),
    price: baseSchema.price.required(),
    category: baseSchema.category.required(),
    categoryIcon: baseSchema.categoryIcon.required(),
    file: joi
      .object({
        image: joi.array().items(multerFileSchema).min(1).max(1).required().messages({
          "any.required": "Product image is required",
        }),
        categoryHeroImg: joi.array().items(multerFileSchema).max(1).optional(),
      })
      .required(),
  })
  .required();

// 2. Update Validation
export const updateMenuItem = joi
  .object()
  .keys({
    ...baseSchema,
    id: generalFields.id.required(),
  })
  .required();

// export const queryFilter = joi.object().keys({
//     category: joi.string().valid(...allowedCategories),
//     search: joi.string().trim().max(100).allow(''),
//     available: joi.string().valid('true', 'false'),
//     sort: joi.string().valid('newest', 'oldest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'),
//     page: joi.number().integer().min(1),
//     limit: joi.number().integer().min(1).max(100),
// }).required();

export const paramId = joi.object().keys({ id: generalFields.id.required() }).required();
