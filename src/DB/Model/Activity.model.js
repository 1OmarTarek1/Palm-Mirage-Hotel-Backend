import mongoose, { Schema, model } from "mongoose";

export const allowedIcons = ["Ship", "Landmark", "Mountain", "Palette", "CloudSun", "ChefHat"];

export const allowedCategories = ["nile", "heritage", "desert", "cultural", "balloon", "culinary"];

const activitySchema = new Schema(
  {
    category: {
      type: String,
      required: true,
      enum: allowedCategories,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      secure_url: { type: String },
      public_id: { type: String },
    },
    stats: [
      {
        value: { type: String, required: true },
        label: { type: String, required: true },
      },
    ],
    highlights: [{ type: String }],
    icon: {
      type: String,
      enum: allowedIcons,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

activitySchema.index({ title: "text", description: "text", label: "text" });

activitySchema.set("toJSON", { virtuals: true });
activitySchema.set("toObject", { virtuals: true });

export const activityModel =
  mongoose.models.Activity || model("Activity", activitySchema);
