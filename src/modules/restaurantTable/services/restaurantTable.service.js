import Table from '../../../DB/Model/table.model.js';
import { asyncHandler } from '../../../utils/response/error.response.js';
import * as dbService from '../../../DB/db.service.js';
import { successResponse } from '../../../utils/response/success.response.js';

// CREATE
export const createTable = asyncHandler(async (req, res) => {
  const { number, chairs } = req.body;

  try {
    const table = await dbService.create({
      model: Table,
      data: { number, chairs },
    });

    res.status(201).json({ message: 'Table created', table });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Table number already exists' });
    }
    throw error;
  }
});

// GET ALL
export const getTables = asyncHandler(async (req, res) => {
  const tables = await dbService.findAll({ model: Table });
  res.json({ tables });
});

// GET BY NUMBER
export const getTableByNumber = asyncHandler(async (req, res) => {
  const number = Number(req.params.number);

  const table = await dbService.findOne({
    model: Table,
    filter: { number },
  });

  if (!table) {
    return res.status(404).json({ message: 'Table not found' });
  }

  res.json({ table });
});

// UPDATE BY NUMBER
export const updateTable = asyncHandler(async (req, res) => {
  const number = Number(req.params.number);
  const updates = req.body;

  const table = await dbService.findOneAndUpdate({
    model: Table,
    filter: { number },
    data: updates,
    options: { new: true, runValidators: true },
  });

  if (!table) {
    return res.status(404).json({ message: 'Table not found' });
  }

  return successResponse({ res, status: 200, data: { table } });
});

// DELETE BY NUMBER
export const deleteTable = asyncHandler(async (req, res) => {
  const number = Number(req.params.number);

  const table = await dbService.findOneAndDelete({
    model: Table,
    filter: { number },
  });

  if (!table) {
    return res.status(404).json({ message: 'Table not found' });
  }

  res.json({ message: 'Table deleted successfully' });
});
