import { asyncHandler } from '../../../utils/response/error.response.js';
import * as dbService from '../../../DB/db.service.js';
import {
  otpTypes,
  providerTypes,
  roleTypes,
  userModel,
} from '../../../DB/Model/User.model.js';
import {
  compareHash,
  generateEncryptHash,
  generateHash,
} from '../../../utils/security/hash.security.js';
import { successResponse } from '../../../utils/response/success.response.js';
import { emailEvent } from '../../../utils/event/email.event.js';
import {
  decodeToken,
  generateToken,
  tokenTypes,
} from '../../../utils/security/token.security.js';
import { OAuth2Client } from 'google-auth-library';

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  console.log({ email, password });

  const user = await dbService.findOne({ model: userModel, filter: { email } });

  if (!user) {
    return next(new Error('user not found'), { cause: 404 });
  }
  if (!user.isConfirmed) {
    return next(new Error('Please Verify your Account'), { cause: 400 });
  }
  if (user.bannedAt != undefined) {
    return next(new Error('your account is  banned'), { cause: 400 });
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
    return next(new Error('Not Provided'), { cause: 400 });
  }
  if (!compareHash({ plainText: password, hashValue: user.password })) {
    return next(new Error('Not found'), { cause: 404 });
  }

  const accessToken = generateToken({
    payload: { id: user._id },
    signature:
      user.role === roleTypes.admin
        ? process.env.SYSTEM_ACCESS_TOKEN
        : process.env.USER_ACCESS_TOKEN,
  });
  const refreshToken = generateToken({
    payload: { id: user._id },
    signature:
      user.role === roleTypes.admin
        ? process.env.SYSTEM_REFRESH_TOKEN
        : process.env.USER_REFRESH_TOKEN,
    expiresIn: 31536000,
  });

  return successResponse({
    res,
    status: 200,
    data: {
      accessToken,
      refreshToken,
    },
  });
});

export const loginWithGmail = asyncHandler(async (req, res, next) => {
  return successResponse({
    res,
    status: 200,
    data: {},
  });
});

export const refreshToken = asyncHandler(async (req, res, next) => {
  const user = await decodeToken({
    authorization: req.headers.authorization,
    tokenType: tokenTypes.refresh,
    next,
  });

  const accessToken = generateToken({
    payload: { id: user._id },
    signature:
      user.role === roleTypes.admin
        ? process.env.SYSTEM_ACCESS_TOKEN
        : process.env.USER_ACCESS_TOKEN,
  });
  ///////////////////////////////
  const refreshToken = generateToken({
    payload: { id: user._id },
    signature:
      user.role === roleTypes.admin
        ? process.env.SYSTEM_REFRESH_TOKEN
        : process.env.USER_REFRESH_TOKEN,
    expiresIn: '7d',
  });

  return successResponse({
    res,
    status: 201,
    data: {
      token: {
        accessToken,
        refreshToken,
      },
    },
  });
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await userModel.findOne({ email, deletedAt: null });

  if (!user) {
    return next(new Error(' account not found'), { cause: 404 });
  }

  if (!user.isConfirmed) {
    return next(new Error('Verify your account first'), {
      cause: 400,
    });
  }
  emailEvent.emit('sendForgetPassword', { email });

  return successResponse({ res });
});