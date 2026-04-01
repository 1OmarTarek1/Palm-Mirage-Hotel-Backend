import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { roleTypes, userModel } from "../../../DB/Model/User.model.js";
import { successResponse } from "../../../utils/response/success.response.js";

const userSelect = "-password -OTP -__v";

const normalizeUser = (user) => {
  if (!user) return null;

  const item = user.toObject ? user.toObject() : user;
  return {
    id: item._id,
    userName: item.userName,
    email: item.email,
    role: item.role,
    gender: item.gender,
    country: item.country,
    phoneNumber: item.phoneNumber ?? "",
    isConfirmed: Boolean(item.isConfirmed),
    image: item.image ?? "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

//profile
export const userData = asyncHandler(async (req, res, next) => {
  const user = await dbService.findOne({
    model: userModel,
    filter: { _id: req.user._id },
  });
  return successResponse({ res, data: { user } });
});

//delete account
export const deleteAccount = asyncHandler(
    async (req, res, next) => {
        const user = await dbService.findOneAndUpdate({
            model: userModel,
            filter: {
                _id: req.user._id,
                deletedAt: null
            },
            options: { new: true },
            data: { deletedAt: Date.now() },
        })
        return successResponse({ res, message: "Account Freeze successfully" })
    }
)

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userModel
    .find({ deletedAt: { $exists: false } })
    .select(userSelect)
    .sort({ createdAt: -1 });

  return successResponse({
    res,
    data: { users: users.map(normalizeUser) },
  });
});

export const createAdminUser = asyncHandler(async (req, res, next) => {
  const existingUser = await userModel.findOne({ email: req.body.email });
  if (existingUser) {
    return next(new Error("Email already exists", { cause: 409 }));
  }

  const user = await userModel.create({
    userName: req.body.userName,
    email: req.body.email,
    password: req.body.password || "User123!",
    country: req.body.country,
    gender: req.body.gender,
    role: req.body.role || roleTypes.user,
    phoneNumber: req.body.phoneNumber || "",
    image: req.body.image || "",
    isConfirmed: req.body.isConfirmed ?? true,
  });

  const createdUser = await userModel.findById(user._id).select(userSelect);

  return successResponse({
    res,
    status: 201,
    message: "User created successfully",
    data: { user: normalizeUser(createdUser) },
  });
});

export const updateAdminUser = asyncHandler(async (req, res, next) => {
  const existingUser = await userModel.findById(req.params.userId);

  if (!existingUser) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (req.body.email && req.body.email !== existingUser.email) {
    const emailExists = await userModel.findOne({ email: req.body.email });
    if (emailExists) {
      return next(new Error("Email already exists", { cause: 409 }));
    }
  }

  const updateData = {
    ...(req.body.userName !== undefined && { userName: req.body.userName }),
    ...(req.body.email !== undefined && { email: req.body.email }),
    ...(req.body.country !== undefined && { country: req.body.country }),
    ...(req.body.gender !== undefined && { gender: req.body.gender }),
    ...(req.body.role !== undefined && { role: req.body.role }),
    ...(req.body.phoneNumber !== undefined && { phoneNumber: req.body.phoneNumber }),
    ...(req.body.image !== undefined && { image: req.body.image }),
    ...(req.body.isConfirmed !== undefined && { isConfirmed: req.body.isConfirmed }),
  };

  if (req.body.password) {
    updateData.password = req.body.password;
  }

  const updatedUser = await userModel
    .findOneAndUpdate({ _id: req.params.userId }, updateData, { new: true, runValidators: true })
    .select(userSelect);

  return successResponse({
    res,
    message: "User updated successfully",
    data: { user: normalizeUser(updatedUser) },
  });
});

export const deleteAdminUser = asyncHandler(async (req, res, next) => {
  const user = await userModel.findByIdAndDelete(req.params.userId).select(userSelect);

  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "User deleted successfully",
    data: { user: normalizeUser(user) },
  });
});


// export const banUserfromAdmin = asyncHandler(async (req, res, next) => {
//     const { userid } = req.params;
//     const data = await dbService.findOneAndUpdate({ model: userModel, filter: { _id: userid }, data: { bannedAt: Date.now() }, options: { new: true } })
//     return successResponse({ res, message: "done" })

// })

// export const unbanUserfromAdmin = asyncHandler(async (req, res, next) => {
//     const { userId } = req.params;
//     const data = await dbService.findOneAndUpdate({ model: userModel, filter: { _id: userId }, data: { $unset: { bannedAt: 0 } }, options: { new: true } })
//     return successResponse({ res, message: "done" })

// })
