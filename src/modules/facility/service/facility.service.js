import * as dbService from "../../../DB/db.service.js";
import { FacilityModel } from "../../../DB/Model/Facility.model.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { paginate } from "../../../utils/pagination/pagination.js";

//  Create Facility
export const createFacility = asyncHandler(async (req, res, next) => {
  const { name, icon, description, category, location, capacity, status, image, operatingHours } = req.body;

  // prevent duplicates
  const existing = await dbService.findOne({
    model: FacilityModel,
    filter: { name: name.trim().toLowerCase() },
  });

  if (existing) {
    return next(new Error("Facility already exists", { cause: 409 }));
  }

  const facility = await dbService.create({
    model: FacilityModel,
    data: {
      name: name.trim().toLowerCase(),
      category,
      icon,
      description,
      location,
      capacity,
      status,
      image,
      operatingHours,
    },
  });

  return successResponse({
    res,
    data: { facility },
    message: "Facility created successfully",
  });
});

// Get All Facilities
export const getAllFacilities = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, status, category, sort } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
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
    model: FacilityModel,
    filter,
    sort: sortMap[sort] || { name: 1 },
  });

  return successResponse({
    res,
    data: {
      facilities: result.data,
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
    message: "Facilities retrieved successfully",
  });
});

// Get Facility By ID
export const getFacilityById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const facility = await dbService.findOne({
    model: FacilityModel,
    filter: { _id: id },
  });

  if (!facility) {
    return next(new Error("Facility not found", { cause: 404 }));
  }

  return successResponse({
    res,
    data: { facility },
    message: "Facility retrieved successfully",
  });
});

// Update Facility
export const updateFacilityById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const facility = await dbService.findOne({
    model: FacilityModel,
    filter: { _id: id },
  });

  if (!facility) {
    return next(new Error("Facility not found", { cause: 404 }));
  }

  const updates = { ...req.body };

  if (updates.name) {
    updates.name = updates.name.trim().toLowerCase();
  }

  const updatedFacility = await dbService.findByIdAndUpdate({
    model: FacilityModel,
    id,
    data: updates,
    options: { new: true, runValidators: true },
  });

  return successResponse({
    res,
    data: { facility: updatedFacility },
    message: "Facility updated successfully",
  });
});

//  Delete Facility
export const deleteFacilityById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const facility = await dbService.findOne({
    model: FacilityModel,
    filter: { _id: id },
  });

  if (!facility) {
    return next(new Error("Facility not found", { cause: 404 }));
  }

  // prevent deleting if used in rooms
  const isUsed = await dbService.findOne({
    model: (await import("../../../DB/Model/Room.model.js")).RoomModel,
    filter: { facilities: id },
  });

  if (isUsed) {
    return next(
      new Error("Cannot delete facility, it is used in rooms", {
        cause: 400,
      })
    );
  }

  await dbService.findByIdAndDelete({
    model: FacilityModel,
    id,
  });

  return successResponse({
    res,
    message: "Facility deleted successfully",
  });
});
