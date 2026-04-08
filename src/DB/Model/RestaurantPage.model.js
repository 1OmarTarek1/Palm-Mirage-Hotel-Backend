import mongoose from 'mongoose';

const restaurantPageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    heroImage: { type: String, required: true },
    interiorImage: { type: String, required: true },
    detailA: { type: String, required: true },
    detailB: { type: String, required: true },
    diningImage: { type: String, required: true },
  },
  { timestamps: true }
);

export const restaurantPageModel =
  mongoose.models.RestaurantPage || mongoose.model('RestaurantPage', restaurantPageSchema);
