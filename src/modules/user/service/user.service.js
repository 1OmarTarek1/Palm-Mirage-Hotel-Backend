import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { roleTypes, userModel } from "../../../DB/Model/User.model.js";
import { successResponse } from "../../../utils/response/success.response.js";
import cloudinary from "../../../utils/multer/cloudinary.js";

const userSelect = "-password -OTP -__v -cartItems -wishlistItems -restaurantCart";
const preferenceSelect = "cartItems wishlistItems restaurantCart";

const sanitizePreferenceItems = (items) => (Array.isArray(items) ? items : []);

const MAX_RESTAURANT_CART_KEYS = 48;
const MAX_RESTAURANT_LINE_QTY = 99;

const sanitizeRestaurantCart = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_RESTAURANT_CART_KEYS) break;
    const id = String(k).trim();
    if (!id || id.length > 32) continue;
    if (!/^[a-fA-F0-9]{24}$/.test(id) && !/^[a-zA-Z0-9_-]{1,32}$/.test(id)) continue;
    const qty = Math.floor(Number(v));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_RESTAURANT_LINE_QTY) continue;
    out[id] = qty;
  }
  return out;
};

const parseBooleanField = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
};

const extractCloudinaryPublicId = (imageUrl) => {
  if (typeof imageUrl !== "string" || !imageUrl.includes("res.cloudinary.com")) {
    return null;
  }

  try {
    const parsedUrl = new URL(imageUrl);
    const uploadMarker = "/upload/";
    const uploadIndex = parsedUrl.pathname.indexOf(uploadMarker);

    if (uploadIndex === -1) {
      return null;
    }

    let publicId = parsedUrl.pathname.slice(uploadIndex + uploadMarker.length);
    publicId = publicId.replace(/^v\d+\//, "");

    const extensionIndex = publicId.lastIndexOf(".");
    if (extensionIndex !== -1) {
      publicId = publicId.slice(0, extensionIndex);
    }

    return decodeURIComponent(publicId);
  } catch {
    return null;
  }
};

const destroyCloudinaryImage = async (imageUrl) => {
  const publicId = extractCloudinaryPublicId(imageUrl);
  if (!publicId) {
    return;
  }

  await cloudinary.uploader.destroy(publicId).catch(() => null);
};

const normalizeUser = (user) => {
  if (!user) return null;

  const item = user.toObject ? user.toObject() : user;
  return {
    id: item._id,
    userName: item.userName,
    email: item.email,
    role: item.role,
    provider: item.provider,
    gender: item.gender,
    country: item.country,
    DOB: item.DOB,
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

export const getPreferences = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user._id).select(preferenceSelect);

  return successResponse({
    res,
    data: {
      cartItems: sanitizePreferenceItems(user?.cartItems),
      wishlistItems: sanitizePreferenceItems(user?.wishlistItems),
      restaurantCart: sanitizeRestaurantCart(user?.restaurantCart),
    },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const shouldRemoveImage = parseBooleanField(req.body.removeImage);
  const currentImage = req.user?.image || "";
  const updateData = {
    ...(req.body.userName !== undefined && { userName: req.body.userName }),
    ...(req.body.country !== undefined && { country: req.body.country }),
    ...(req.body.gender !== undefined && { gender: req.body.gender }),
    ...(req.body.phoneNumber !== undefined && { phoneNumber: req.body.phoneNumber || "" }),
    ...(req.body.DOB !== undefined && {
      DOB: req.body.DOB ? new Date(req.body.DOB) : null,
    }),
  };

  if (req.file) {
    await destroyCloudinaryImage(currentImage);
    const { secure_url } = await cloudinary.uploader.upload(req.file.path, {
      folder: `${process.env.APP_NAME}/users`,
    });
    updateData.image = secure_url;
  } else if (shouldRemoveImage) {
    await destroyCloudinaryImage(currentImage);
    updateData.image = "";
  } else if (req.body.image !== undefined) {
    const nextImage = req.body.image || "";

    if (currentImage && currentImage !== nextImage) {
      await destroyCloudinaryImage(currentImage);
    }

    updateData.image = nextImage;
  }

  const user = await userModel
    .findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    })
    .select(userSelect);

  return successResponse({
    res,
    message: "Profile updated successfully",
    data: { user: normalizeUser(user) },
  });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const updateData = {};

  if (req.body.cartItems !== undefined) {
    updateData.cartItems = sanitizePreferenceItems(req.body.cartItems);
  }

  if (req.body.wishlistItems !== undefined) {
    updateData.wishlistItems = sanitizePreferenceItems(req.body.wishlistItems);
  }

  if (req.body.restaurantCart !== undefined) {
    updateData.restaurantCart = sanitizeRestaurantCart(req.body.restaurantCart);
  }

  const user = await userModel
    .findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    })
    .select(preferenceSelect);

  return successResponse({
    res,
    message: "Preferences updated successfully",
    data: {
      cartItems: sanitizePreferenceItems(user?.cartItems),
      wishlistItems: sanitizePreferenceItems(user?.wishlistItems),
      restaurantCart: sanitizeRestaurantCart(user?.restaurantCart),
    },
  });
});

//delete account
export const deleteAccount = asyncHandler(
    async (req, res, next) => {
        const user = await userModel.findByIdAndDelete(req.user._id)
        if (!user) {
          return next(new Error("Account not found", { cause: 404 }));
        }
        return successResponse({ res, message: "Account deleted successfully" })
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
