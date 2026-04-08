import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    label: { type: String, required: true, unique: true },
    icon: { type: String, required: true }, // e.g., 'Cake', 'Salad', etc. for lucide-react
    heroImg: { type: String, required: true }, // Cloudinary URL
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
