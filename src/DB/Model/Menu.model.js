import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    description: String,

    price: { type: Number, required: true },

    category: {
      type: String,
      required: true,
      enum: ['Desserts', 'Appetizer', 'Restaurant', 'Drinks'],
    },

    image: { type: String }, // Cloudinary URL

    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Menu', menuSchema);