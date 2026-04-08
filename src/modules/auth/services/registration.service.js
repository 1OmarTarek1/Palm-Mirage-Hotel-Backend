import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { otpTypes, userModel } from "../../../DB/Model/User.model.js";
import { compareHash, generateHash } from "../../../utils/security/hash.security.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { sendEmail } from "../../../utils/email/send.email.js";
import { verficatioinEmailTemplate } from "../../../utils/email/template/verfication.email.js";
import { customAlphabet } from "nanoid";

async function issueConfirmEmailOtp(email) {
  const emailotp = customAlphabet("0123456789", 4)();
  const hashOTP = generateHash({ plainText: `${emailotp}` });
  const OTP = {
    code: hashOTP,
    type: otpTypes.confirmEmail,
    expiresIn: new Date(Date.now() + 10 * 60 * 1000),
  };

  // Keep only the latest confirm-email OTP to avoid confusion.
  await dbService.updateOne({
    model: userModel,
    filter: { email },
    data: { $pull: { OTP: { type: otpTypes.confirmEmail } } },
  });

  await dbService.updateOne({
    model: userModel,
    filter: { email },
    data: { $push: { OTP } },
    options: { new: true },
  });

  const html = verficatioinEmailTemplate({ code: emailotp });
  await sendEmail({ to: email, subject: "Confirm-Email", html });
}

export const signup = asyncHandler(async (req, res, next) => {
  const { userName, country, email, password, phoneNumber } = req.body;

  const existingUser = await dbService.findOne({ model: userModel, filter: { email } });

  if (existingUser?.deletedAt) {
    await userModel.findByIdAndDelete(existingUser._id);
  } else if (existingUser) {
    return next(new Error("Email exists"), { cause: 409 });
  }
  const user = await dbService.create({
    model: userModel,
    data: { userName, country, email, password, phoneNumber },
  });
  try {
    await issueConfirmEmailOtp(email);
  } catch {
    return next(new Error("Failed to send verification code. Please try again."), { cause: 500 });
  }
  return successResponse({
    res,
    status: 201,
    data: { user },
  });
});
// confirmEmail
export const confirmEmail = asyncHandler(async (req, res, next) => {
  const { code, email } = req.body;
  const user = await dbService.findOne({ model: userModel, filter: { email, deletedAt: null } });

  if (!user) {
    return next(new Error("Email not exists"), { cause: 404 });
  }

  //chech if otp expires
  const validOtp = user.OTP.find((otp) => otp.expiresIn > new Date() && otp.type === otpTypes.confirmEmail);
  if (!validOtp) {
    try {
      await issueConfirmEmailOtp(email);
    } catch {
      return next(new Error("OTP expired and failed to resend a new code. Please try again."), { cause: 500 });
    }
    return next(new Error("expires OTP PLease input your new OTP from your email"), { cause: 404 });
  }
  if (user.isConfirmed) {
    return next(new Error("Already confirmed"), { cause: 409 });
  }
  if (!compareHash({ plainText: code, hashValue: validOtp.code })) {
    return next(new Error("in-valid OTP"), { cause: 400 });
  }

  await dbService.updateOne({ model: userModel, filter: { email }, data: { isConfirmed: true, $unset: { OTP: 0 } } });

  return successResponse({ res, status: 201, data: {} });
});

export const resendConfirmEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await dbService.findOne({
    model: userModel,
    filter: { email, deletedAt: null },
  });

  if (!user) {
    return next(new Error("Email not exists"), { cause: 404 });
  }

  if (user.isConfirmed) {
    return next(new Error("Already confirmed"), { cause: 409 });
  }

  try {
    await issueConfirmEmailOtp(email);
  } catch {
    return next(new Error("Failed to resend verification code. Please try again."), { cause: 500 });
  }

  return successResponse({
    res,
    status: 200,
    message: "Verification code sent successfully",
    data: {},
  });
});

