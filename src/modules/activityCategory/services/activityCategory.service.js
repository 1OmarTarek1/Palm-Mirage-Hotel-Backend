import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { activityCategoryModel } from "../../../DB/Model/ActivityCategory.model.js";
import { activityModel } from "../../../DB/Model/Activity.model.js";

export const createCategory = asyncHandler(async (req, res, next) => {
  const { label, icon } = req.body;

  const existing = await dbService.findOne({
    model: activityCategoryModel,
    filter: { label },
  });
  if (existing) {
    return next(new Error("Category with this label already exists", { cause: 409 }));
  }

  const category = await dbService.create({
    model: activityCategoryModel,
    data: { label, icon, createdBy: req.user._id },
  });

  return successResponse({ res, status: 201, data: { category } });
});

export const getAllCategories = asyncHandler(async (req, res, next) => {
  const categories = await dbService.findAll({
    model: activityCategoryModel,
  });

  return successResponse({ res, data: { categories } });
});

export const getCategoryById = asyncHandler(async (req, res, next) => {
  const category = await dbService.findOne({
    model: activityCategoryModel,
    filter: { _id: req.params.id },
  });

  if (!category) {
    return next(new Error("Category not found", { cause: 404 }));
  }

  return successResponse({ res, data: { category } });
});

export const updateCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { label, icon } = req.body;

  if (label) {
    const existing = await dbService.findOne({
      model: activityCategoryModel,
      filter: { label, _id: { $ne: id } },
    });
    if (existing) {
      return next(new Error("Category with this label already exists", { cause: 409 }));
    }
  }

  const category = await dbService.findOneAndUpdate({
    model: activityCategoryModel,
    filter: { _id: id },
    data: { ...(label && { label }), ...(icon && { icon }) },
    options: { new: true },
  });

  if (!category) {
    return next(new Error("Category not found", { cause: 404 }));
  }

  return successResponse({ res, data: { category } });
});

export const deleteCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const activitiesUsingCategory = await dbService.findOne({
    model: activityModel,
    filter: { category: id },
  });
  if (activitiesUsingCategory) {
    return next(
      new Error("Cannot delete category — activities are still referencing it", { cause: 400 })
    );
  }

  const category = await dbService.findOneAndDelete({
    model: activityCategoryModel,
    filter: { _id: id },
  });

  if (!category) {
    return next(new Error("Category not found", { cause: 404 }));
  }

  return successResponse({ res, data: { category } });
});
