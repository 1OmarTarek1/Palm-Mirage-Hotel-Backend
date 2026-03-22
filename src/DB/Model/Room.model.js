import mongoose, { Schema, model } from "mongoose";

const RoomSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    roomName: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
    },

    roomType: {
      type: String,
      enum: ["single", "double", "twin", "deluxe", "family"],
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    discount: {
      type: Number,
      default: 0,
    },

    capacity: {
      type: Number,
      default: 1,
    },

    facilities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Facility",
      },
    ],

    roomImages: [
      {
        type: String,
      },
    ],

    description: {
      type: String,
    },

    hasOffer: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    floor: {
      type: Number,
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    reviewsCount: {
      type: Number,
      default: 0,
    },

    viewsCount: {
      type: Number,
      default: 0,
    },

    checkInTime: {
      type: String,
      default: "14:00",
    },

    checkOutTime: {
      type: String,
      default: "12:00",
    },

    cancellationPolicy: {
      type: String,
    },
  },
  { timestamps: true },
);

export const RoomModel = mongoose.models.Room || model("Room", RoomSchema);