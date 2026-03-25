import Category from '../../../DB/Model/Category.model.js';
import * as dbService from '../../../DB/db.service.js';
import { asyncHandler } from '../../../utils/response/error.response.js';

// Create Category
export const createCategory = asyncHandler(async (req, res) => {
  const { label, icon } = req.body;

  const category = await dbService.create({
    model: Category,
    data: { label, icon, heroImg: req.file?.path },
  });

  return res.status(201).json({
    message: 'Category created',
    category,
  });
});

// Get All Categories
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await dbService.find({
    model: Category,
  });

  return res.status(200).json({
    message: 'Categories retrieved',
    categories,
  });
});

// Get Category by ID
export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await dbService.findOne({
    model: Category,
    filter: { _id: id },
  });

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  return res.status(200).json({
    message: 'Category retrieved',
    category,
  });
});

// Update Category
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { label, icon } = req.body;

  const category = await dbService.findOneAndUpdate({
    model: Category,
    filter: { _id: id },
    data: {
      label,
      icon,
      ...(req.file?.path && { heroImg: req.file.path }),
    },
    options: { new: true },
  });

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  return res.status(200).json({
    message: 'Category updated',
    category,
  });
});

// Delete Category
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await dbService.findOneAndDelete({
    model: Category,
    filter: { _id: id },
  });

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  // Optionally, delete all menu items in this category
  // await dbService.deleteMany({ model: Menu, filter: { category: id } });

  return res.status(200).json({
    message: 'Category deleted',
    category,
  });
});
