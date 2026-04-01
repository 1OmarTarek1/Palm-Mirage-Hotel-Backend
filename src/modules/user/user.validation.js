import joi from "joi";
import { roleTypes, genderTypes } from "../../DB/Model/User.model.js";
import { generalFields } from "../../middleware/validation.middleware.js";

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

