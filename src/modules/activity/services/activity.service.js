import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { activityModel } from "../../../DB/Model/Activity.model.js";
import { activityCategoryModel } from "../../../DB/Model/ActivityCategory.model.js";
import cloudinary from "../../../utils/multer/cloudinary.js";

export const createActivity = asyncHandler(async (req, res, next) => {
  const { category, label, title, description, stats, highlights, icon } = req.body;

  const categoryExists = await dbService.findOne({
    model: activityCategoryModel,
    filter: { _id: category },
  });
  if (!categoryExists) {
    return next(new Error("Category not found", { cause: 404 }));
  }

  const titleExists = await dbService.findOne({
    model: activityModel,
    filter: { title },
  });
  if (titleExists) {
    return next(new Error("Activity with this title already exists", { cause: 409 }));
  }

  let image = {};
  if (req.file) {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `${process.env.APP_NAME}/activities` },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
    image = { secure_url: uploadResult.secure_url, public_id: uploadResult.public_id };
  }

  const activity = await dbService.create({
    model: activityModel,
    data: {
      category,
      label,
      title,
      description,
      image,
      stats: stats || [],
      highlights: highlights || [],
      icon,
      createdBy: req.user._id,
    },
  });

  return successResponse({ res, status: 201, data: { activity } });
});

export const getAllActivities = asyncHandler(async (req, res, next) => {
  const filter = {};
  if (req.query.category) {
    filter.category = req.query.category;
  }

  const activities = await dbService.findAll({
    model: activityModel,
    filter,
    populate: [{ path: "category", select: "label icon" }],
  });

  return successResponse({ res, data: { activities } });
});

export const getActivityById = asyncHandler(async (req, res, next) => {
  const activity = await dbService.findOne({
    model: activityModel,
    filter: { _id: req.params.id },
    populate: [{ path: "category", select: "label icon" }],
  });

  if (!activity) {
    return next(new Error("Activity not found", { cause: 404 }));
  }

  return successResponse({ res, data: { activity } });
});

export const updateActivity = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { category, label, title, description, stats, highlights, icon } = req.body;

  const existing = await dbService.findOne({
    model: activityModel,
    filter: { _id: id },
  });
  if (!existing) {
    return next(new Error("Activity not found", { cause: 404 }));
  }

  if (category) {
    const categoryExists = await dbService.findOne({
      model: activityCategoryModel,
      filter: { _id: category },
    });
    if (!categoryExists) {
      return next(new Error("Category not found", { cause: 404 }));
    }
  }

  if (title && title !== existing.title) {
    const titleExists = await dbService.findOne({
      model: activityModel,
      filter: { title, _id: { $ne: id } },
    });
    if (titleExists) {
      return next(new Error("Activity with this title already exists", { cause: 409 }));
    }
  }

  let image;
  if (req.file) {
    if (existing.image?.public_id) {
      await cloudinary.uploader.destroy(existing.image.public_id);
    }
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `${process.env.APP_NAME}/activities` },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
    image = { secure_url: uploadResult.secure_url, public_id: uploadResult.public_id };
  }

  const updateData = {};
  if (category) updateData.category = category;
  if (label) updateData.label = label;
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (stats) updateData.stats = stats;
  if (highlights) updateData.highlights = highlights;
  if (icon) updateData.icon = icon;
  if (image) updateData.image = image;

  const activity = await dbService.findOneAndUpdate({
    model: activityModel,
    filter: { _id: id },
    data: updateData,
    options: { new: true },
    populate: [{ path: "category", select: "label icon" }],
  });

  return successResponse({ res, data: { activity } });
});

export const deleteActivity = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const activity = await dbService.findOneAndDelete({
    model: activityModel,
    filter: { _id: id },
  });

  if (!activity) {
    return next(new Error("Activity not found", { cause: 404 }));
  }

  if (activity.image?.public_id) {
    await cloudinary.uploader.destroy(activity.image.public_id);
  }

  return successResponse({ res, data: { activity } });
});
