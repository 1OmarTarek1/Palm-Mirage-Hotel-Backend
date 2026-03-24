import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
 name: { type: String, required: true },
  location: { type: String, required: true }
  },
  { timestamps: true }
);

restaurantSchema.index({ name: 1 });
restaurantSchema.index({ location: 1 });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

export default Restaurant;





