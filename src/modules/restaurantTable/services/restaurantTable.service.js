import { TableModel } from "../../../DB/Model/table.model.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { successResponse } from "../../../utils/response/success.response.js";

// CREATE
export const createTable = asyncHandler(async (req, res, next) => {
  const { number, chairs } = req.body;

  if (await dbService.findOne({ model: TableModel, filter: { number } })) {
    return next(new Error("Table number already exists"), { cause: 409 });
  }

  const table = await dbService.create({
    model: TableModel,
    data: { number, chairs },
  });

  return successResponse({ res, status: 200, message: "Table created", data: { table } });
});

// GET ALL
export const getTables = asyncHandler(async (req, res, next) => {
  const tables = await dbService.findAll({ model: TableModel });
  return successResponse({ res, status: 200, data: { tables } });
});

// GET BY NUMBER
export const getTableByNumber = asyncHandler(async (req, res, next) => {
  const number = Number(req.params.number);

  const table = await dbService.findOne({
    model: TableModel,
    filter: { number },
  });

  if (!table) {
    return next(new Error("Table not found"), { cause: 404 });
  }
  return successResponse({ res, status: 200, data: { table } });
});

// UPDATE BY NUMBER
export const updateTable = asyncHandler(async (req, res, next) => {
  const number = Number(req.params.number);
  const updates = req.body;

  const table = await dbService.findOneAndUpdate({
    model: TableModel,
    filter: { number },
    data: updates,
    options: { new: true, runValidators: true },
  });

  if (!table) {
    return next(new Error("Table not found"), { cause: 404 });
  }

  return successResponse({ res, status: 200, data: { table } });
});

// DELETE BY NUMBER
export const deleteTable = asyncHandler(async (req, res, next) => {
  const number = Number(req.params.number);

  const table = await dbService.findOneAndDelete({
    model: TableModel,
    filter: { number },
  });

  if (!table) {
    return next(new Error("Table not found"), { cause: 404 });
  }
  return successResponse({ res, status: 200, data: { table }, message: "Table deleted successfully" });
});
