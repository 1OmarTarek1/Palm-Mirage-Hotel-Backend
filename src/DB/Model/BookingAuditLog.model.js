import mongoose, { Schema } from "mongoose";

export const bookingAuditEntityTypes = [
  "activity_booking",
  "restaurant_booking",
  "room_booking",
  "payment_checkout",
];

const bookingAuditLogSchema = new Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: bookingAuditEntityTypes,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

bookingAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const BookingAuditLog =
  mongoose.models.BookingAuditLog || mongoose.model("BookingAuditLog", bookingAuditLogSchema);
