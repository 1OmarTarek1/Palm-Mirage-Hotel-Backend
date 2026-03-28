import mongoose, { Schema, model } from "mongoose";

export const RoomSchema = new Schema(
  {
    roomName: {
      type: String,
      required: true,
      trim: true,
    },

    roomNumber: {
      type: Number,
      required: true,
      unique: true,
    },

    roomType: {
      type: String,
      enum: ["single", "double", "twin", "deluxe", "family"],
      required: true,
      index: true,
    },

    price: {
      type: Number,
      required: true,
    },

    finalPrice: {
      type: Number,
    },

    capacity: {
      type: Number,
      default: 1,
      min: 1,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 75,
    },

    description: {
      type: String,
      default: "",
    },

    facilities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Facility",
      },
    ],

    roomImages: [
      {
        secure_url: { type: String },
        public_id: { type: String },
      },
    ],

    hasOffer: {
      type: Boolean,
      default: false,
    },

    // flag (real availability comes from bookings)
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
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    checkOutTime: {
      type: String,
      default: "12:00",
      // match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      // required: true,
    },

    cancellationPolicy: {
      type: String,
    },
  },
  { timestamps: true },
);

// calculate final price
RoomSchema.pre("save", function () {
  // calculate final price
  this.finalPrice = this.price - (this.price * this.discount) / 100;
});

// Indexes (for filtering & sorting)
RoomSchema.index({ price: 1 });
RoomSchema.index({ rating: -1 });

export const RoomModel = mongoose.models.Room || model("Room", RoomSchema);
