import { asyncHandler } from '../../../utils/response/error.response.js';
import { successResponse } from '../../../utils/response/success.response.js';
import * as dbService from '../../../DB/db.service.js';
import { menuModel } from '../../../DB/Model/Menu.model.js';
import cloud from '../../../utils/multer/cloudinary.js';

// 1. Create Menu Item
export const createMenuItem = asyncHandler(async (req, res, next) => {
  const { name, description, price, category, categoryIcon } = req.body;

  let image;
  if (req.files?.image?.[0]) {
    const { secure_url } = await cloud.uploader.upload(req.files.image[0].path, {
      folder: `${process.env.APP_NAME}/menu/items`,
    });
    image = secure_url;
  }

  let categoryHeroImg;
  if (req.files?.categoryHeroImg?.[0]) {
    const { secure_url } = await cloud.uploader.upload(req.files.categoryHeroImg[0].path, {
      folder: `${process.env.APP_NAME}/menu/categories`,
    });
    categoryHeroImg = secure_url;
  } else {
    const lastItemInCategory = await menuModel.findOne({ category }).sort({ createdAt: -1 });
    categoryHeroImg = lastItemInCategory?.categoryHeroImg;
  }

  if (!categoryHeroImg) {
    return next(new Error(`Category "${category}" requires a hero image for the first time.`, { cause: 400 }));
  }

  const item = await dbService.create({
    model: menuModel,
    data: {
      name,
      description,
      price,
      category,
      categoryIcon,
      categoryHeroImg,
      image,
      createdBy: req.user._id,
    },
  });

  return successResponse({
    res,
    status: 201,
    data: { item },
    message: 'Menu item created successfully',
  });
});

// 2. Get All Menu Items (With Filters & Pagination)
export const getAllMenuItems = asyncHandler(async (req, res, next) => {
  const { category, search, available, sort, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (available !== undefined) filter.available = available === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
  };
  const sortBy = sortOptions[sort] || { createdAt: -1 };
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    menuModel.find(filter).sort(sortBy).skip(skip).limit(Number(limit)),
    menuModel.countDocuments(filter),
  ]);

  return successResponse({
    res,
    data: {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// 3. Get Menu (Grouped by Category for Frontend)
export const getMenu = asyncHandler(async (req, res, next) => {
  const items = await menuModel.find({ available: true });

  const categoryMenuItems = {};
  const categoriesMap = {};

  items.forEach((item) => {
    if (!categoryMenuItems[item.category]) {
      categoryMenuItems[item.category] = [];
      categoriesMap[item.category] = {
        label: item.category,
        icon: item.categoryIcon,
        heroImg: item.categoryHeroImg,
      };
    }
    categoryMenuItems[item.category].push({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
    });
  });

  return successResponse({
    res,
    data: { 
      categories: Object.values(categoriesMap), 
      categoryMenuItems 
    },
  });
});

// 4. Update Menu Item
export const updateMenuItem = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  if (req.files?.image?.[0]) {
    const { secure_url } = await cloud.uploader.upload(req.files.image[0].path, {
      folder: `${process.env.APP_NAME}/menu/items`,
    });
    updateData.image = secure_url;
  }

  if (req.files?.categoryHeroImg?.[0]) {
    const { secure_url } = await cloud.uploader.upload(req.files.categoryHeroImg[0].path, {
      folder: `${process.env.APP_NAME}/menu/categories`,
    });
    updateData.categoryHeroImg = secure_url;
  }

  const item = await dbService.findOneAndUpdate({
    model: menuModel,
    filter: { _id: id },
    data: updateData,
    options: { new: true },
  });

  if (!item) return next(new Error('Item not found', { cause: 404 }));

  return successResponse({ res, data: { item }, message: 'Updated successfully' });
});

// // 5. Get Single Item
// export const getMenuItemById = asyncHandler(async (req, res, next) => {
//   const item = await menuModel.findById(req.params.id);
//   if (!item) return next(new Error('Item not found', { cause: 404 }));
//   return successResponse({ res, data: { item } });
// });

// 6. Delete Item
export const deleteMenuItem = asyncHandler(async (req, res, next) => {
  const item = await menuModel.findByIdAndDelete(req.params.id);
  if (!item) return next(new Error('Item not found', { cause: 404 }));
  return successResponse({ res, message: 'Deleted successfully' });
});

