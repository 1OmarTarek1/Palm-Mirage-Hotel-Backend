import Table from '../../DB/Model/table.model.js';
import { asyncHandler } from '../../../src/utils/response/error.response.js';
import * as dbService from '../../../DB/db.service.js';

export const createTable = asyncHandler(async (req, res) => {
  const { number, chairs } = req.body;

  try {
    const table = await dbService.create({ model: Table, data: { number, chairs } });
    res.status(201).json({ message: 'Table created', table });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Table number already exists' });
    }
    throw error;
  }
});