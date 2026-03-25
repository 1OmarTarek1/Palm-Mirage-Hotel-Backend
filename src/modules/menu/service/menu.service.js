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

