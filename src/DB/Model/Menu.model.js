import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    description: String,

    price: { type: Number, required: true },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },

    image: { type: String }, // Cloudinary URL

    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Menu', menuSchema);
