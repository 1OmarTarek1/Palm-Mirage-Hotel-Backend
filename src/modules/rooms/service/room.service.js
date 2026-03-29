import * as dbService from "../../../DB/db.service.js";
import { RoomModel } from "../../../DB/Model/Room.model.js";
// import cloudinary from "../../../utils/multer/cloudinary.js";
import { paginate } from "../../../utils/pagination/pagination.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import cloudinary from "../../../utils/multer/cloudinary.js";
import cloud from "../../../utils/multer/cloudinary.js";

// Create Room
export const createRoom = asyncHandler(async (req, res, next) => {

    if (req.files) {
      const roomImagesData = [];
      for (const file of req.files) {
        const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
          folder: `${process.env.APP_NAME}/room`,
        });
        roomImagesData.push({ secure_url, public_id });
   
      }
      req.body.roomImages = roomImagesData;
    }

  const newRoom = await dbService.create({
    model: RoomModel,
    data: {
      ...req.body
    },
  });

  return successResponse({
    res,
    data: newRoom,
    message: "Room created successfully",
  });
});

// // Get All Rooms
export const getAllRooms = asyncHandler(async (req, res, next) => {
  const {
    minPrice,
    maxPrice,
    roomType,
    capacity,
    minRating,
    hasOffer,
    page,
    limit,
  } = req.query;
 
  let filter = { isAvailable: true };
 
  if (roomType)   filter.roomType = roomType;
  if (capacity)   filter.capacity = { $gte: Number(capacity) };
  if (hasOffer)   filter.hasOffer = hasOffer === "true";
  if (minRating)  filter.rating   = { $gte: Number(minRating) };
 
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
 
  const result = await paginate({
    page:  Number(page)  || 1,
    size:  Number(limit) || 10,
    model: RoomModel,
    filter,
    populate: [
      {
        path:   "facilities",      
        model:  "Facility",        
        select: "name icon -_id",  
      },
    ],
  });
 
  return successResponse({
    res,
    data: result,
    message: "Rooms retrieved successfully",
  });
});

// // Get Rooms with Offers
export const getRoomsWithOffers = asyncHandler(async (req, res, next) => {
  const { page, limit } = req.query;

  const result = await paginate({
    page: Number(page),
    size: Number(limit),
    model: RoomModel,
    filter: { hasOffer: true, isAvailable: true },
    populate: ["facilities"],
    sort: "-discount",
  });

  return successResponse({
    res,
    data: result,
    message: "Rooms with offers retrieved successfully",
  });
});

// // Get Top Rated Rooms
export const getTopRatedRooms = asyncHandler(async (req, res, next) => {
  const { page, limit } = req.query;

  const result = await paginate({
    page: Number(page),
    size: Number(limit),
    model: RoomModel,
    filter: {
      isAvailable: true,
      rating: { $gt: 0 },
    },
    populate: ["facilities"],
    sort: "-rating",
  });

  return successResponse({
    res,
    data: result,
    message: "Top rated rooms retrieved successfully",
  });
});

// // Get Room By ID
export const getRoomById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const room = await dbService.findOne({
    model: RoomModel,
    filter: { _id: id },
    populate: [{ path: "facilities" }],
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

// // Update Room
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
  delete updates.rating;
  delete updates.reviewsCount;
  delete updates.viewsCount;

  let keptImages = Array.isArray(room.roomImages) ? [...room.roomImages] : [];

  const deletedImages = Array.isArray(req.body.deletedImages)
    ? req.body.deletedImages
    : [];

  if (deletedImages.length) {
    const validToDelete = deletedImages.filter((id) =>
      keptImages.some((img) => img.public_id === id),
    );

    await Promise.all(
      validToDelete.map((public_id) => cloudinary.uploader.destroy(public_id)),
    );

    keptImages = keptImages.filter(
      (img) => !deletedImages.includes(img.public_id),
    );
  }

  // Optional pair swap semantics (local UI can send ids to replace)
  const replaceImages = Array.isArray(req.body.replaceImages)
    ? req.body.replaceImages
    : [];

  if (replaceImages.length) {
    for (const item of replaceImages) {
      if (!item.oldPublicId) continue;
      const existed = keptImages.find((img) => img.public_id === item.oldPublicId);
      if (existed) {
        await cloudinary.uploader.destroy(item.oldPublicId);
        keptImages = keptImages.filter((img) => img.public_id !== item.oldPublicId);
      }
    }
  }

  let newImages = [];

  if (req.files?.length) {
    newImages = await Promise.all(
      req.files.map((file) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: `${process.env.APP_NAME}/room` },
            (error, result) => {
              if (error) return reject(error);
              resolve({
                secure_url: result.secure_url,
                public_id: result.public_id,
              });
            },
          );

          stream.end(file.buffer);
        }),
      ),
    );
  }

  updates.roomImages = [...keptImages, ...newImages];

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

// // Delete Room
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
