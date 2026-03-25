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
    },

    pricePerNight: {
      type: Number,
      required: true,
    },

    totalPrice: {
      type: Number,
    },

    guests: {
      type: Number,
      default: 1,
      min: 1,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "checked-in",
        "completed",
        "cancelled",
        "no-show",
      ],
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

    hasCheckedIn: {
      type: Boolean,
      default: false,
    },

    hasCheckedOut: {
      type: Boolean,
      default: false,
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
  { timestamps: true }
);


// Validate dates
bookingSchema.pre("validate", function () {
  if (this.checkOutDate <= this.checkInDate) {
    throw new Error(
      "Check-out date must be after check-in date"
    );
  }
});


// Calculate nights + total price
bookingSchema.pre("save", function () {
  const diffTime = this.checkOutDate - this.checkInDate;

  this.nights = Math.ceil(
    diffTime / (1000 * 60 * 60 * 24)
  );

  this.totalPrice = this.nights * this.pricePerNight;
});


//  Index for date queries
bookingSchema.index({
  checkInDate: 1,
  checkOutDate: 1,
});

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);