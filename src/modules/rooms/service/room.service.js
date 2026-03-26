import * as dbService from "../../../DB/db.service.js";
import { RoomModel } from "../../../DB/Model/Room.model.js";
import cloudinary from "../../../utils/multer/cloudinary.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";

// Create Room
export const createRoom = asyncHandler(async (req, res, next) => {
  const {
    roomName,
    roomType,
    price,
    discount,
    capacity,
    facilities,
    description,
    floor,
    cancellationPolicy,
    checkInTime,
    checkOutTime,
  } = req.body;

  let roomImagesData = [];

  if (req.files?.length) {
    for (const file of req.files) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `${process.env.APP_NAME}/room` },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );

        stream.end(file.buffer);
      });

      roomImagesData.push({
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      });
    }
  }

  const newRoom = await dbService.create({
    model: RoomModel,
    data: {
      // user: req.user._id,
      roomName,
      roomType,
      price,
      discount,
      capacity,
      facilities,
      description,
      floor,
      roomImages: roomImagesData,
      cancellationPolicy,
      checkInTime,
      checkOutTime,
    },
  });

  return successResponse({
    res,
    data: newRoom,
    message: "Room created successfully",
  });
});

// Get All Rooms
export const getAllRooms = asyncHandler(async (req, res, next) => {
  const {
    minPrice,
    maxPrice,
    roomType,
    capacity,
    minRating,
    hasOffer,
    page = 1,
    limit = 10,
  } = req.query;

  let filter = { isAvailable: true };

  if (roomType) filter.roomType = roomType;
  if (capacity) filter.capacity = { $gte: Number(capacity) };
  if (hasOffer) filter.hasOffer = hasOffer === "true";
  if (minRating) filter.rating = { $gte: Number(minRating) };

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const skip = (page - 1) * limit;

  const rooms = await dbService.findAll({
    model: RoomModel,
    filter,
    populate: ["facilities"],
    skip,
    limit: Number(limit),
  });

  return successResponse({
    res,
    data: rooms,
    message: "Rooms retrieved successfully",
  });
});

// Get Rooms with Offers
export const getRoomsWithOffers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const rooms = await dbService.findAll({
    model: RoomModel,
    filter: { hasOffer: true, isAvailable: true },
    populate: ["facilities"],
    skip,
    limit: Number(limit),
    sort: "-discount",
  });

  return successResponse({
    res,
    data: rooms,
    message: "Rooms with offers retrieved successfully",
  });
});

// Get Top Rated Rooms
export const getTopRatedRooms = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const rooms = await dbService.findAll({
    model: RoomModel,
    filter: {
      isAvailable: true,
      rating: { $gt: 0 },
    },
    populate: ["facilities"],
    skip,
    limit: Number(limit),
    sort: "-rating",
  });

  return successResponse({
    res,
    data: rooms,
    message: "Top rated rooms retrieved successfully",
  });
});

// Get Room By ID
export const getRoomById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const room = await dbService.findOne({
    model: RoomModel,
    filter: { _id: id },
    populate: [{ path: "facilities" }, { path: "user", select: "name email" }],
  });

  if (!room) {
    return next(new Error("Room not found", { cause: 404 }));
  }

  // increase views
  await dbService.updateOne({
    model: RoomModel,
    filter: { _id: id },
    data: { $inc: { viewsCount: 1 } },
  });

  return successResponse({
    res,
    data: room,
    message: "Room retrieved successfully",
  });
});

// Update Room
export const updateRoomById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const room = await dbService.findOne({
    model: RoomModel,
    filter: { _id: id },
  });

  if (!room) {
    return next(new Error("Room not found", { cause: 404 }));
  }

  const updates = { ...req.body };

  // protect system fields
  delete updates.rating;
  delete updates.reviewsCount;
  delete updates.viewsCount;

  const updatedRoom = await dbService.findByIdAndUpdate({
    model: RoomModel,
    id,
    data: updates,
    options: { new: true, runValidators: true },
    populate: ["facilities"],
  });

  return successResponse({
    res,
    data: updatedRoom,
    message: "Room updated successfully",
  });
});

// Delete Room
export const deleteRoomById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const room = await dbService.findOne({
    model: RoomModel,
    filter: { _id: id },
  });

  if (!room) {
    return next(new Error("Room not found", { cause: 404 }));
  }

  await dbService.findByIdAndDelete({
    model: RoomModel,
    id,
  });

  return successResponse({
    res,
    message: "Room deleted successfully",
  });
});
