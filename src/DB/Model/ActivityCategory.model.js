import mongoose, { Schema, model } from "mongoose";

export const allowedIcons = ["Ship", "Landmark", "Mountain", "Palette", "CloudSun", "ChefHat"];

const activityCategorySchema = new Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    icon: {
      type: String,
      required: true,
      enum: allowedIcons,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

activityCategorySchema.set("toJSON", { virtuals: true });
activityCategorySchema.set("toObject", { virtuals: true });

export const activityCategoryModel =
  mongoose.models.ActivityCategory || model("ActivityCategory", activityCategorySchema);
