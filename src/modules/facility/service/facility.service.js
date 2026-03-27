import * as dbService from "../../../DB/db.service.js";
import { FacilityModel } from "../../../DB/Model/Facility.model.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";

//  Create Facility
export const createFacility = asyncHandler(async (req, res, next) => {
  const { name, icon, description } = req.body;

  // prevent duplicates
  const existing = await dbService.findOne({
    model: FacilityModel,
    filter: { name: name.toLowerCase() },
  });

  if (existing) {
    return next(new Error("Facility already exists", { cause: 409 }));
  }

  const facility = await dbService.create({
    model: FacilityModel,
    data: {
      name: name.toLowerCase(),
      icon,
      description,
    },
  });

  return successResponse({
    res,
    data: facility,
    message: "Facility created successfully",
  });
});

// Get All Facilities
export const getAllFacilities = asyncHandler(async (req, res, next) => {
  const facilities = await dbService.findAll({
    model: FacilityModel,
    sort: "name",
  });

  return successResponse({
    res,
    data: facilities,
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
    data: facility,
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
    updates.name = updates.name.toLowerCase();
  }

  const updatedFacility = await dbService.findByIdAndUpdate({
    model: FacilityModel,
    id,
    data: updates,
    options: { new: true, runValidators: true },
  });

  return successResponse({
    res,
    data: updatedFacility,
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
