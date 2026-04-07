import * as dbService from "../../../DB/db.service.js";
import { RoomAmenityModel } from "../../../DB/Model/RoomAmenity.model.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { paginate } from "../../../utils/pagination/pagination.js";

function normalizeAmenityName(name = "") {
  return name.trim().replace(/\s+/g, " ");
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const createRoomAmenity = asyncHandler(async (req, res, next) => {
  const normalizedName = normalizeAmenityName(req.body.name);

  const existingAmenity = await dbService.findOne({
    model: RoomAmenityModel,
    filter: { name: new RegExp(`^${escapeRegex(normalizedName)}$`, "i") },
  });

  if (existingAmenity) {
    return next(new Error("Room amenity already exists", { cause: 409 }));
  }

  const amenity = await dbService.create({
    model: RoomAmenityModel,
    data: {
      name: normalizedName,
      icon: req.body.icon?.trim() || "Wifi",
      description: req.body.description?.trim() || "",
    },
  });

  return successResponse({
    res,
    data: { amenity },
    message: "Room amenity created successfully",
  });
});

export const getAllRoomAmenities = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, sort } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { icon: { $regex: search, $options: "i" } },
    ];
  }
  const sortMap = {
    name_asc: { name: 1 },
    name_desc: { name: -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
  };
  const result = await paginate({
    page: Number(page) || 1,
    size: Number(limit) || 10,
    model: RoomAmenityModel,
    filter,
    sort: sortMap[sort] || { name: 1 },
  });

  return successResponse({
    res,
    data: {
      amenities: result.data,
      items: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    },
    message: "Room amenities retrieved successfully",
  });
});

export const getRoomAmenityById = asyncHandler(async (req, res, next) => {
  const amenity = await dbService.findOne({
    model: RoomAmenityModel,
    filter: { _id: req.params.id },
  });

  if (!amenity) {
    return next(new Error("Room amenity not found", { cause: 404 }));
  }

  return successResponse({
    res,
    data: { amenity },
    message: "Room amenity retrieved successfully",
  });
});

export const updateRoomAmenityById = asyncHandler(async (req, res, next) => {
  const existingAmenity = await dbService.findOne({
    model: RoomAmenityModel,
    filter: { _id: req.params.id },
  });

  if (!existingAmenity) {
    return next(new Error("Room amenity not found", { cause: 404 }));
  }

  const updates = { ...req.body };
  if (typeof updates.name === "string") {
    updates.name = normalizeAmenityName(updates.name);
  }
  if (typeof updates.icon === "string") {
    updates.icon = updates.icon.trim() || "Wifi";
  }
  if (typeof updates.description === "string") {
    updates.description = updates.description.trim();
  }

  const duplicateAmenity =
    updates.name &&
    (await dbService.findOne({
      model: RoomAmenityModel,
      filter: {
        _id: { $ne: req.params.id },
        name: new RegExp(`^${escapeRegex(updates.name)}$`, "i"),
      },
    }));

  if (duplicateAmenity) {
    return next(new Error("Another room amenity already uses this name", { cause: 409 }));
  }

  const amenity = await dbService.findByIdAndUpdate({
    model: RoomAmenityModel,
    id: req.params.id,
    data: updates,
    options: { new: true, runValidators: true },
  });

  return successResponse({
    res,
    data: { amenity },
    message: "Room amenity updated successfully",
  });
});

export const deleteRoomAmenityById = asyncHandler(async (req, res, next) => {
  const amenity = await dbService.findOne({
    model: RoomAmenityModel,
    filter: { _id: req.params.id },
  });

  if (!amenity) {
    return next(new Error("Room amenity not found", { cause: 404 }));
  }

  const isUsedInRooms = await dbService.findOne({
    model: (await import("../../../DB/Model/Room.model.js")).RoomModel,
    filter: { amenities: req.params.id },
  });

  if (isUsedInRooms) {
    return next(
      new Error("Cannot delete room amenity because it is currently assigned to rooms", {
        cause: 400,
      })
    );
  }

  await dbService.findByIdAndDelete({
    model: RoomAmenityModel,
    id: req.params.id,
  });

  return successResponse({
    res,
    message: "Room amenity deleted successfully",
  });
});
