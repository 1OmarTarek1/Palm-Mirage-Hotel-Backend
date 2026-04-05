import mongoose from "mongoose";

export const paymentCheckoutKinds = ["room", "activity", "restaurant"];

const checkoutItemSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    roomName: {
      type: String,
      required: true,
      trim: true,
    },
    roomNumber: {
      type: Number,
    },
    roomType: {
      type: String,
      trim: true,
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
      required: true,
      min: 1,
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const payItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false },
);

const paymentCheckoutSessionSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: paymentCheckoutKinds,
      default: "room",
      index: true,
    },
    linkedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      sparse: true,
    },
    payItems: {
      type: [payItemSchema],
      default: [],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionFingerprint: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    items: {
      type: [checkoutItemSchema],
      default: [],
    },
    currency: {
      type: String,
      required: true,
      default: "usd",
      lowercase: true,
      trim: true,
    },
    amountSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    amountTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["creating", "open", "completed", "expired", "cancelled", "failed", "fulfilled"],
      default: "creating",
      index: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    bookingNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
    stripeSessionUrl: {
      type: String,
      trim: true,
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
      trim: true,
    },
    stripePaymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "no_payment_required"],
      default: "unpaid",
    },
    successUrl: {
      type: String,
      trim: true,
    },
    cancelUrl: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    fulfilledAt: {
      type: Date,
    },
    failureReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

paymentCheckoutSessionSchema.pre("validate", function validateCheckoutPayload(next) {
  const kind = this.kind || "room";
  if (kind === "room") {
    if (!Array.isArray(this.items) || this.items.length === 0) {
      this.invalidate("items", "At least one room item is required");
    }
  } else {
    if (!Array.isArray(this.payItems) || this.payItems.length === 0) {
      this.invalidate("payItems", "At least one line item is required");
    }
    this.items = [];
  }
  next();
});

paymentCheckoutSessionSchema.index({ user: 1, sessionFingerprint: 1, status: 1 });

export const PaymentCheckoutSession =
  mongoose.models.PaymentCheckoutSession ||
  mongoose.model("PaymentCheckoutSession", paymentCheckoutSessionSchema);
