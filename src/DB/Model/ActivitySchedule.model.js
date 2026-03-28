import mongoose, { Schema, model } from "mongoose";

export const activityScheduleStatuses = ["scheduled", "full", "cancelled", "completed"];

const activityScheduleSchema = new Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
      index: true,
    },
    date: {
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
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    availableSeats: {
      type: Number,
      min: 0,
    },
    priceOverride: {
      type: Number,
      min: 0,
      default: null,
    },
    status: {
      type: String,
      enum: activityScheduleStatuses,
      default: "scheduled",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

activityScheduleSchema.pre("validate", function () {
  if (this.availableSeats === undefined || this.availableSeats === null) {
    this.availableSeats = this.capacity;
  }

  if (this.availableSeats === 0 && this.status === "scheduled") {
    this.status = "full";
  }
});

activityScheduleSchema.index({ activity: 1, date: 1, startTime: 1 }, { unique: true });

export const activityScheduleModel =
  mongoose.models.ActivitySchedule || model("ActivitySchedule", activityScheduleSchema);
