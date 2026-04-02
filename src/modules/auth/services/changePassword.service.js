import { asyncHandler } from '../../../utils/response/error.response.js';
import * as dbService from '../../../DB/db.service.js';
import { userModel } from '../../../DB/Model/User.model.js';
import {
  compareHash,
  generateHash,
} from '../../../utils/security/hash.security.js';
import { successResponse } from '../../../utils/response/success.response.js';

// PATCH /auth/change-password
// Requires: authentication middleware (req.user set by auth middleware)
export const changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  // 1. Fetch the authenticated user from DB
  const user = await dbService.findOne({
    model: userModel,
    filter: { _id: req.user._id, deletedAt: null },
  });

  if (!user) {
    return next(new Error('User not found'), { cause: 404 });
  }

  if (user.bannedAt) {
    return next(new Error('Your account is banned'), { cause: 403 });
  }

  // 2. Verify old password matches the stored hash
  const isMatch = compareHash({ plainText: oldPassword, hashValue: user.password });
  if (!isMatch) {
    return next(new Error('Old password is incorrect'), { cause: 400 });
  }

  // 3. Make sure new password is different from the old one
  const isSamePassword = compareHash({ plainText: newPassword, hashValue: user.password });
  if (isSamePassword) {
    return next(new Error('New password must be different from the old password'), { cause: 400 });
  }

  // 4. Hash the new password
  const hashedNewPassword = generateHash({
    plainText: newPassword,
    salt: process.env.SALT,
  });

  // 5. Update password and set changeCredentialTime to invalidate existing tokens
  await dbService.updateOne({
    model: userModel,
    filter: { _id: req.user._id },
    data: {
      password: hashedNewPassword,
      changeCredentialTime: new Date(),
    },
  });

  return successResponse({
    res,
    status: 200,
    message: 'Password changed successfully',
    data: {},
  });
});
