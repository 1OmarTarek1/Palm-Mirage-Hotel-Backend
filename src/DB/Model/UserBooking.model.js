import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    checkInDate: {
      type: Date,
      required: true,
    },

    checkOutDate: {
      type: Date,
      required: true,
    },

    nights: {
      type: Number,
      min: 1,
    },

    pricePerNight: {
      type: Number,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    guests: {
      type: Number,
      default: 1,
      min: 1,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "checked-in", "completed", "cancelled", "no-show"],
      default: "pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "online"],
    },

    specialRequests: {
      type: String,
      trim: true,
    },

    cancellationReason: {
      type: String,
      trim: true,
    },

    bookedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export const UserBooking =
  mongoose.models.UserBooking || mongoose.model("UserBooking", bookingSchema);
