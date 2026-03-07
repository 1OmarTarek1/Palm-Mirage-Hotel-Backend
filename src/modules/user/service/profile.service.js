import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { userModel } from "../../../DB/Model/User.model.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { compareHash } from "../../../utils/security/hash.security.js";

//profile
export const profile = asyncHandler(async (req, res, next) => {
  return successResponse({ res, data: {} });
});

export const updatPassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, password } = req.body;

  return successResponse({ res, data: {} });
});

//delete account
export const deleteAccount = asyncHandler(async (req, res, next) => {
  return successResponse({ res, message: "Account Freeze successfully" });
});
