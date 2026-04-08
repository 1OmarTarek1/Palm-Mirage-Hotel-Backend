import mongoose, { Schema, model } from "mongoose";

const facilitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    category: {
      type: String,
      default: "General",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Available", "Maintenance", "Busy", "Closed"],
      default: "Available",
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    icon: {
      type: String,
      unique: true,
    },

    operatingHours: {
      type: String,
      default: "",
      trim: true,
    },
    
  },
  { timestamps: true },
);

export const FacilityModel = mongoose.models.Facility || model("Facility", facilitySchema);
