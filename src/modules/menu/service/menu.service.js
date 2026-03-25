import Menu from '../../../DB/Model/Menu.model.js';
import Category from '../../../DB/Model/Category.model.js';
import * as dbService from '../../../DB/db.service.js';
import { asyncHandler } from '../../../utils/response/error.response.js';

export const createMenuItem = asyncHandler(async (req, res) => {
  const { name, description, price, category } = req.body;

  // Verify category exists
  const categoryExists = await dbService.findOne({
    model: Category,
    filter: { _id: category },
  });

  if (!categoryExists) {
    return res.status(400).json({ message: 'Invalid category' });
  }

  const item = await dbService.create({
    model: Menu,
    data: {
      name,
      description,
      price,
      category,
      image: req.file?.path,
    },
  });

  return res.status(201).json({
    message: 'Menu item created',
    item,
  });
});

// Get Menu - returns categories and menu items grouped by category
export const getMenu = asyncHandler(async (req, res) => {
  const categories = await dbService.find({
    model: Category,
  });

  const menuItems = await dbService.find({
    model: Menu,
    populate: [{ path: 'category', select: 'label' }],
  });

  // Group items by category label
  const categoryMenuItems = {};
  categories.forEach(cat => {
    categoryMenuItems[cat.label] = menuItems
      .filter(item => item.category._id.toString() === cat._id.toString())
      .map(item => ({
        id: item._id,
        name: item.name,
        description: item.description,
        price: $`${item.price}`,
        img: item.image,
      }));
  });

  // Format categories for frontend
  const formattedCategories = categories.map(cat => ({
    label: cat.label,
    Icon: cat.icon, // Frontend will map to actual icon
    heroImg: cat.heroImg,
  }));

  return res.status(200).json({
    message: 'Menu retrieved',
    categories: formattedCategories,
    categoryMenuItems,
  });
});