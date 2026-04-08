import mongoose, { Schema, model } from "mongoose";

const audienceValues = ["user", "admin"];
const typeValues = ["booking", "payment"];
const severityValues = ["info", "success", "warning", "error"];

const notificationSchema = new Schema(
  {
    audience: {
      type: String,
      enum: audienceValues,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: typeValues,
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: severityValues,
      default: "info",
    },
    resource: { type: String, trim: true },
    action: { type: String, trim: true },
    bookingIds: [{ type: String }],
    metadata: { type: Schema.Types.Mixed },
    dedupeKey: { type: String, index: true },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ audience: 1, userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ audience: 1, readAt: 1, createdAt: -1 });

export const NotificationModel =
  mongoose.models.Notification || model("Notification", notificationSchema);
