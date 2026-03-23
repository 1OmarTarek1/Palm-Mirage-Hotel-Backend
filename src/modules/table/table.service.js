import Table from '../../DB/Model/table.model.js';
import { asyncHandler } from '../../../src/utils/response/error.response.js';
import * as dbService from '../../../DB/db.service.js';

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
//get
export const getTables = asyncHandler(async (req, res) => {
  const tables = await dbService.findAll({ model: Table });
  res.json({ tables });
});
//get by id
export const getTableById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const table = await dbService.findOne({ model: Table, filter: { _id: id } });

  if (!table) return res.status(404).json({ message: 'Table not found' });

  res.json({ table });
});
//get by number
export const getTableByNumber = asyncHandler(async (req, res) => {
  const number = Number(req.params.number);

  const table = await dbService.findOne({ model: Table, filter: { number } });

  if (!table) return res.status(404).json({ message: 'Table not found' });

  res.json({ table });
});

//update
export const updateTable = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const table = await dbService.findByIdAndUpdate({
      model: Table,
      id,
      data: updates,
      options: { new: true, runValidators: true },
    });

    if (!table) return res.status(404).json({ message: 'Table not found' });

    res.json({ message: 'Table updated', table });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Table number already exists' });
    }
    throw error;
  }
});

//delete
export const deleteTable = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const table = await dbService.findByIdAndDelete({ model: Table, id });

  if (!table) return res.status(404).json({ message: 'Table not found' });

  res.json({ message: 'Table deleted successfully' });
});