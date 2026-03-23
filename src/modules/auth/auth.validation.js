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

export const forgetPassword = joi
  .object()
  .keys({
    email: generalFields.email.required(),
  })
  .required();

export const resetPassword = joi
  .object()
  .keys({
    code: generalFields.code.required(),
    email: generalFields.email.required(),
    password: generalFields.password.required(),
    confirmationPassword: generalFields.confirmationPassword
      .valid(joi.ref('password'))
      .required(),
  })
  .required();

export const changePassword = joi
  .object()
  .keys({
    oldPassword: generalFields.password.required(),
    newPassword: generalFields.password.required(),
    confirmationPassword: generalFields.confirmationPassword
      .valid(joi.ref('newPassword'))
      .required(),
  })
  .required();

export const loginWithGoogle = joi
  .object()
  .keys({
    idToken: joi.string().required(),
    mode: joi.string().valid('login', 'register').default('login'),
  })
  .required();
