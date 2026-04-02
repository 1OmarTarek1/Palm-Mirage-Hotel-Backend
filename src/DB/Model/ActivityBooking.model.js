import mongoose, { Schema, model } from "mongoose";

export const activityBookingStatuses = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
];

export const activityBookingPaymentStatuses = ["unpaid", "paid", "refunded"];

const activityBookingSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
      index: true,
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivitySchedule",
      required: true,
      index: true,
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    pricingType: {
      type: String,
      enum: ["per_person", "per_group"],
      required: true,
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: activityBookingStatuses,
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: activityBookingPaymentStatuses,
      default: "unpaid",
    },
    contactPhone: {
      type: String,
      trim: true,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

activityBookingSchema.index({ user: 1, createdAt: -1 });
activityBookingSchema.index({ schedule: 1, status: 1 });

export const activityBookingModel =
  mongoose.models.ActivityBooking || model("ActivityBooking", activityBookingSchema);
