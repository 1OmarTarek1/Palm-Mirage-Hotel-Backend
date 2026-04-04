import mongoose, { Schema } from 'mongoose';

const restaurantBookingSchema = new Schema(
  {
    tableNumber: {
      type: Number,
      ref: 'Table',
      required: function () {
        return this.status !== 'pending';
      },
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    collection: 'bookings',
  }
);

restaurantBookingSchema.index({ tableNumber: 1, startTime: 1, endTime: 1 });
restaurantBookingSchema.index({ user: 1 });

const RestaurantBookingModel =
  mongoose.models.RestaurantBooking ||
  mongoose.model('RestaurantBooking', restaurantBookingSchema);

export default RestaurantBookingModel;
