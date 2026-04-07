import { asyncHandler } from '../../../utils/response/error.response.js';
import { successResponse } from '../../../utils/response/success.response.js';
import * as dbService from '../../../DB/db.service.js';
import { menuModel } from '../../../DB/Model/Menu.model.js';
import { restaurantPageModel } from '../../../DB/Model/RestaurantPage.model.js';
import cloud from '../../../utils/multer/cloudinary.js';
import { paginate } from '../../../utils/pagination/pagination.js';

const SECTION_ID_BY_LABEL = {
  Appetizer: 'appetizer',
  Restaurant: 'restaurant',
  Desserts: 'desserts',
  Drinks: 'drinks',
};

/** Public menu / restaurant page category order (must match Menu.model enum labels). */
const MENU_CATEGORY_ORDER = ['Appetizer', 'Restaurant', 'Desserts', 'Drinks'];

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
  const result = await paginate({
    page: Number(page) || 1,
    size: Number(limit) || 10,
    model: menuModel,
    filter,
    sort: sortBy,
  });

  return successResponse({
    res,
    data: {
      items: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    },
  });
});

// 3. Get Menu (Grouped by Category for Frontend)
export const getMenu = asyncHandler(async (req, res, next) => {
  const items = await menuModel.find({ available: true }).lean();

  const byCategory = {};
  for (const item of items) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  const categoryMenuItems = {};
  const categoriesMap = {};

  for (const cat of Object.keys(byCategory)) {
    const catItems = byCategory[cat];
    // Use the most recently updated item for section hero/icon so dashboard edits apply reliably
    // (previously the first document in DB order won, which often stayed stale).
    const representative = catItems.reduce((best, cur) => {
      const tBest = new Date(best.updatedAt || 0).getTime();
      const tCur = new Date(cur.updatedAt || 0).getTime();
      return tCur >= tBest ? cur : best;
    });

    categoriesMap[cat] = {
      label: cat,
      sectionId: SECTION_ID_BY_LABEL[cat] ?? cat.toLowerCase(),
      icon: representative.categoryIcon,
      heroImg: representative.categoryHeroImg,
    };
    categoryMenuItems[cat] = catItems.map((item) => ({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
    }));
  }

  const categories = MENU_CATEGORY_ORDER.filter((label) => categoriesMap[label]).map(
    (label) => categoriesMap[label]
  );

  return successResponse({
    res,
    data: {
      categories,
      categoryMenuItems,
    },
  });
});

// 3b. Marketing images for the public restaurant landing page (seeded document)
const DEFAULT_RESTAURANT_PAGE_IMAGES = {
  heroImage:
    'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
  interiorImage:
    'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=1400&h=1800&fit=crop',
  detailA:
    'https://images.pexels.com/photos/704569/pexels-photo-704569.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop',
  detailB:
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop',
  diningImage:
    'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=1400&h=1750&fit=crop',
};

export const getRestaurantPage = asyncHandler(async (req, res) => {
  const doc = await restaurantPageModel.findOne({ key: 'main' }).lean();
  const src = doc ?? DEFAULT_RESTAURANT_PAGE_IMAGES;
  return successResponse({
    res,
    data: {
      images: {
        hero: src.heroImage,
        interior: src.interiorImage,
        detailA: src.detailA,
        detailB: src.detailB,
        dining: src.diningImage,
      },
    },
  });
});

// 4. Update Menu Item
export const updateMenuItem = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  if (updateData.price !== undefined && updateData.price !== '') {
    const parsed = Number(updateData.price);
    if (!Number.isNaN(parsed)) updateData.price = parsed;
  }
  if (typeof updateData.available === 'string') {
    updateData.available = updateData.available === 'true';
  }
  if (updateData.categoryIcon === '') {
    delete updateData.categoryIcon;
  }

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

