import Menu from '../../DB/Model/menu.model.js';
import * as dbService from '../../../DB/db.service.js';
import { asyncHandler } from '../../menu/service/menu.service';

export const createMenuItem = asyncHandler(async (req, res) => {
  const { name, description, price, category } = req.body;

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