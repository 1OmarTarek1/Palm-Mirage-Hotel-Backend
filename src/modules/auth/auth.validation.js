import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";

export const signup = joi
  .object()
  .keys({
    userName: generalFields.username.required(),
    country: generalFields.country.required(),
    email: generalFields.email.required(),
    password: generalFields.password.required(),
    confirmationPassword: generalFields.confirmationPassword.valid(joi.ref("password")).required(),
    phoneNumber: generalFields.phone.required(),
  })
  .required();

export const confirmEmail = joi
  .object()
  .keys({
    email: generalFields.email.required(),
    code: generalFields.code.required(),
  })
  .required();

export const login = joi
  .object()
  .keys({
    email: generalFields.email.required(),
    password: generalFields.password.required(),
  })
  .required();

export const forgetPassword = joi.object().keys({}).required();

export const resetPassword = joi.object().keys({}).required();
