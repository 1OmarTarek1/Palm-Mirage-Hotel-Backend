import joi from "joi";
import { roleTypes, genderTypes } from "../../DB/Model/User.model.js";
import { generalFields } from "../../middleware/validation.middleware.js";

const preferenceItem = joi.object().unknown(true);

export const createAdminUser = joi.object({
  userName: generalFields.username.required(),
  email: generalFields.email.required(),
  password: generalFields.password.optional(),
  country: generalFields.country.required(),
  gender: joi.string().valid(...Object.values(genderTypes)).required(),
  role: joi.string().valid(...Object.values(roleTypes)).required(),
  phoneNumber: joi.string().allow("", null),
  image: joi.string().uri().allow("", null),
  isConfirmed: joi.boolean().optional(),
  file: generalFields.file.optional(),
});

export const updateAdminUser = joi.object({
  userId: generalFields.id.required(),
  userName: generalFields.username.optional(),
  email: generalFields.email.optional(),
  password: generalFields.password.optional().allow(""),
  country: generalFields.country.optional(),
  gender: joi.string().valid(...Object.values(genderTypes)).optional(),
  role: joi.string().valid(...Object.values(roleTypes)).optional(),
  phoneNumber: joi.string().allow("", null),
  image: joi.string().uri().allow("", null),
  isConfirmed: joi.boolean().optional(),
});

export const adminUserIdParam = joi.object({
  userId: generalFields.id.required(),
});

const restaurantCartKeys = joi
  .object()
  .pattern(
    joi
      .string()
      .max(32)
      .pattern(/^[a-fA-F0-9]{24}$|^[a-zA-Z0-9_-]{1,32}$/),
    joi.number().integer().min(1).max(99),
  )
  .max(48);

export const updatePreferences = joi
  .object({
    cartItems: joi.array().items(preferenceItem).optional(),
    wishlistItems: joi.array().items(preferenceItem).optional(),
    restaurantCart: restaurantCartKeys.optional(),
    pendingActivityBookings: joi.array().items(preferenceItem).optional(),
    pendingRestaurantBookings: joi.array().items(preferenceItem).optional(),
  })
  .or(
    "cartItems",
    "wishlistItems",
    "restaurantCart",
    "pendingActivityBookings",
    "pendingRestaurantBookings",
  );

export const updateProfile = joi
  .object({
    userName: generalFields.username.optional(),
    country: generalFields.country.optional(),
    gender: joi.string().valid(...Object.values(genderTypes)).optional(),
    phoneNumber: joi.string().allow("", null),
    DOB: joi.date().optional().allow(null, ""),
    image: joi.string().uri().allow("", null),
    removeImage: joi.boolean().truthy("true").falsy("false").optional(),
    file: generalFields.file.optional(),
  })
  .or("userName", "country", "gender", "phoneNumber", "DOB", "image", "removeImage", "file");

// export const updateBasicProfile = joi.object().keys({
//     mobileNumber: generalFields.phone,
//     DOB: generalFields.DOB,
//     firstName: generalFields.username,
//     lastName: generalFields.username,
//     Gender: generalFields.gender,
// }).required()

// export const ban = joi.object().keys({
//     userId: generalFields.id.required(),
// }).required()

