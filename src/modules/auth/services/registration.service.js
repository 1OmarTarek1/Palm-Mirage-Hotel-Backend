import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { otpTypes, userModel } from "../../../DB/Model/User.model.js";
import { compareHash } from "../../../utils/security/hash.security.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { emailEvent } from "../../../utils/event/email.event.js";

export const signup = asyncHandler(async (req, res, next) => {
  const { userName, country, email, password, phoneNumber } = req.body;
console.log({ userName, country, email, password, phoneNumber });

  if (await dbService.findOne({ model: userModel, filter: { email } })) {
    return next(new Error("Email exists"), { cause: 409 });
  }
  const user = await dbService.create({
    model: userModel,
    data: { userName, country, email, password, phoneNumber },
  });
  emailEvent.emit("sendConfirmEmail", { email });
  return successResponse({ res, status: 201, data: { user } });
});
// confirmEmail
export const confirmEmail = asyncHandler(async (req, res, next) => {
  const { code, email } = req.body;
  const user = await dbService.findOne({ model: userModel, filter: { email } });

  if (!user) {
    return next(new Error("Email not exists"), { cause: 404 });
  }

  //chech if otp expires
  const validOtp = user.OTP.find((otp) => otp.expiresIn > new Date() && otp.type === otpTypes.confirmEmail);
  if (!validOtp) {
    emailEvent.emit("sendConfirmEmail", { email });
    return next(new Error("expires OTP PLease input your new OTP from your email"), { cause: 404 });
  }
  if (user.confirmEmail) {
    return next(new Error("Already confirmed"), { cause: 409 });
  }
  if (!compareHash({ plainText: code, hashValue: validOtp.code })) {
    return next(new Error("in-valid OTP"), { cause: 400 });
  }

  await dbService.updateOne({ model: userModel, filter: { email }, data: { isConfirmed: true, $unset: { OTP: 0 } } });

  return successResponse({ res, status: 201, data: {} });
});

