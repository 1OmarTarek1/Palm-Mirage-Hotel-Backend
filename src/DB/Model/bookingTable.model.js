import mongoose, { Schema } from "mongoose";

export const restaurantBookingModes = ["table_only", "dine_in", "room_service", "pickup"];
export const restaurantPaymentMethods = ["stripe", "cash"];

const lineItemSchema = new Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
    },
    nameSnapshot: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const restaurantBookingSchema = new Schema(
  {
    tableNumber: {
      type: Number,
      ref: "Table",
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["pending", "awaiting_payment", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    bookingMode: {
      type: String,
      enum: restaurantBookingModes,
      default: "table_only",
    },
    lineItems: {
      type: [lineItemSchema],
      default: [],
    },
    paymentMethod: {
      type: String,
      enum: restaurantPaymentMethods,
      default: "cash",
    },
    roomNumber: {
      type: Number,
    },
    linkedUserBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserBooking",
    },
    checkoutSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentCheckoutSession",
    },
    lineItemsTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: "bookings",
  },
);

restaurantBookingSchema.index({ tableNumber: 1, startTime: 1, endTime: 1 });
restaurantBookingSchema.index({ user: 1 });

const RestaurantBookingModel =
  mongoose.models.RestaurantBooking ||
  mongoose.model("RestaurantBooking", restaurantBookingSchema);

export default RestaurantBookingModel;
