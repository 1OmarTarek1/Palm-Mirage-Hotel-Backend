import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { otpTypes, providerTypes, roleTypes, userModel } from "../../../DB/Model/User.model.js";
import { compareHash, generateHash } from "../../../utils/security/hash.security.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { emailEvent } from "../../../utils/event/email.event.js";
import { decodeToken, generateToken, tokenTypes } from "../../../utils/security/token.security.js";
import { OAuth2Client } from "google-auth-library";

const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.MOOD !== "DEV",
  maxAge: 365 * 24 * 60 * 60 * 1000,
  path: "/auth/refresh-token",
});

const buildAccessCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.MOOD !== "DEV",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
});

const attachRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, buildRefreshCookieOptions());
};

const attachAccessTokenCookie = (res, accessToken) => {
  res.cookie("accessToken", accessToken, buildAccessCookieOptions());
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", buildRefreshCookieOptions());
};

const clearAccessTokenCookie = (res) => {
  res.clearCookie("accessToken", buildAccessCookieOptions());
};

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await dbService.findOne({ model: userModel, filter: { email } });

  if (!user) {
    return next(new Error("user not found"), { cause: 404 });
  }
  if (!user.isConfirmed) {
    return next(new Error("Please Verify your Account"), { cause: 400 });
  }
  if (user.bannedAt != undefined) {
    return next(new Error("your account is  banned"), { cause: 400 });
  }
  if (user.deletedAt != undefined) {
    await dbService.findOneAndUpdate({
      model: userModel,
      filter: {
        email,
      },
      options: { new: true },
      data: { $unset: { deletedAt } },
    });
  }
  if (user.provider != providerTypes.system) {
    return next(new Error("Not Provided"), { cause: 400 });
  }
  if (!compareHash({ plainText: password, hashValue: user.password })) {
    return next(new Error("Not found"), { cause: 404 });
  }

  const accessToken = generateToken({
    payload: { id: user._id },
    signature: user.role === roleTypes.admin ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN,
  });
  const refreshToken = generateToken({
    payload: { id: user._id },
    signature: user.role === roleTypes.admin ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
    expiresIn: 31536000,
  });

  attachRefreshTokenCookie(res, refreshToken);
  attachAccessTokenCookie(res, accessToken);

  return successResponse({
    res,
    status: 200,
    data: {
      role: user.role,
      accessToken,
    },
  });
});

export const loginWithGmail = asyncHandler(async (req, res, next) => {
  const { idToken } = req.body;
  const client = new OAuth2Client(process.env.CLIENT_ID);

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.CLIENT_ID,
  });
  const payload = ticket.getPayload();

  if (!payload.email_verified) {
    return next(new Error("Google email is not verified"), { cause: 400 });
  }

  let user = await dbService.findOne({
    model: userModel,
    filter: { email: payload.email },
  });

  if (user) {
    if (user.provider !== providerTypes.google) {
      return next(new Error("This email is already registered with email & password. Please login normally."), {
        cause: 409,
      });
    }
    if (user.bannedAt) {
      return next(new Error("Your account is banned"), { cause: 403 });
    }
    if (user.deletedAt) {
      await dbService.updateOne({
        model: userModel,
        filter: { email: payload.email },
        data: { $unset: { deletedAt: 1 } },
      });
    }
  } else {
    user = await dbService.create({
      model: userModel,
      data: {
        userName: payload.name,
        email: payload.email,
        provider: providerTypes.google,
        isConfirmed: true,
        image: payload.picture,
        country: "N/A",
      },
    });
  }

  const accessToken = generateToken({
    payload: { id: user._id },
    signature: user.role === roleTypes.admin ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN,
  });
  const refreshToken = generateToken({
    payload: { id: user._id },
    signature: user.role === roleTypes.admin ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
    expiresIn: 31536000,
  });

  attachRefreshTokenCookie(res, refreshToken);
  attachAccessTokenCookie(res, accessToken);

  return successResponse({
    res,
    status: 200,
    data: {
      accessToken,
      isNewUser: !user.createdAt || Date.now() - new Date(user.createdAt).getTime() < 5000,
    },
  });
});

export const getMe = asyncHandler(async (req, res, next) => {
  const { _id, userName, email, image, provider, gender, DOB, phoneNumber, country, role, createdAt } = req.user;

  return successResponse({
    res,
    data: {
      user: { _id, userName, email, image, provider, gender, DOB, phoneNumber, country, role, createdAt },
    },
  });
});

export const refreshToken = asyncHandler(async (req, res, next) => {
  const cookieRefreshToken = req.cookies?.refreshToken;
  const authHeader = req.headers.authorization;
  const authorization = cookieRefreshToken ? `Bearer ${cookieRefreshToken}` : authHeader;

  const user = await decodeToken({
    authorization,
    tokenType: tokenTypes.refresh,
    next,
  });

  const accessToken = generateToken({
    payload: { id: user._id },
    signature: user.role === roleTypes.admin ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN,
  });
  const refreshToken = generateToken({
    payload: { id: user._id },
    signature: user.role === roleTypes.admin ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
    expiresIn: "7d",
  });

  if (cookieRefreshToken) {
    attachRefreshTokenCookie(res, refreshToken);
  }
  attachAccessTokenCookie(res, accessToken);

  return successResponse({
    res,
    status: 201,
    data: {
      token: {
        accessToken,
        refreshToken: cookieRefreshToken ? undefined : refreshToken,
      },
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  clearRefreshTokenCookie(res);
  clearAccessTokenCookie(res);

  return successResponse({
    res,
    status: 200,
  });
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await dbService.findOne({
    model: userModel,
    filter: { email, deletedAt: null },
  });
  if (!user) {
    return next(new Error(" account not found"), { cause: 404 });
  }

  if (!user.isConfirmed) {
    return next(new Error("Verify your account first"), {
      cause: 400,
    });
  }
  emailEvent.emit("sendForgetPassword", { email });

  return successResponse({ res });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, code, password } = req.body;

  const user = await dbService.findOne({
    model: userModel,
    filter: { email, deletedAt: null },
  });
  if (!user) {
    return next(new Error("In-valid account"), { cause: 404 });
  }

  const validOtp = user.OTP.find((otp) => otp.expiresIn > new Date() && otp.type === otpTypes.forgetPassword);
  if (!validOtp) {
    emailEvent.emit("sendForgetPassword", { email });
    return next(new Error("expires OTP PLease input your new OTP from your email"), { cause: 404 });
  }
  if (!compareHash({ plainText: code, hashValue: validOtp.code })) {
    return next(new Error("Invalid code"), { cause: 400 });
  }
  const hashPassword = generateHash({ plainText: password });

  await dbService.updateOne({
    model: userModel,
    filter: { email },
    data: {
      password: hashPassword,
      confirmEmail: true,
      changeCredentialTime: Date.now(),
    },
  });

  return successResponse({ res });
});
