import mongoose from "mongoose";

export const allowedCategories = ["Appetizer", "Restaurant", "Desserts", "Drinks"];

const menuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: allowedCategories,
      required: true,
      trim: true,
    },
    categoryIcon: { type: String, default: "" },
    categoryHeroImg: { type: String, default: "" },
    image: { type: String, default: "" },
    available: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const menuModel = mongoose.models.Menu || mongoose.model("Menu", menuSchema);

export default menuModel;
