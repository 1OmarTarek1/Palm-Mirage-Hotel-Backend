import mongoose, { model, Schema } from "mongoose";

export const tableSchema = new Schema(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    chairs: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true }
);

export const TableModel = mongoose.models.Table || model("Table", tableSchema);
