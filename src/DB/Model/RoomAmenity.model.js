import mongoose, { Schema, model } from "mongoose";

export const RoomAmenitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    icon: {
      type: String,
      default: "Wifi",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

export const RoomAmenityModel =
  mongoose.models.RoomAmenity || model("RoomAmenity", RoomAmenitySchema);
