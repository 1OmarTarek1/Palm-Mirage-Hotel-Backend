
import mongoose, { Schema, model } from 'mongoose';

export const allowedCategories = ['Desserts', 'Appetizer', 'Restaurant', 'Drinks'];

const menuSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
       required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: allowedCategories,
      trim: true,
    },
    categoryIcon: {
      type: String,
      required: true,
      trim: true,
    },
    categoryHeroImg: {
      type: String,
      required: true,
    },
    image: { type: String , required: true,},
    available: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

menuSchema.index({ name: 'text', description: 'text' });

menuSchema.set('toJSON', { virtuals: true });
menuSchema.set('toObject', { virtuals: true });

export const menuModel =
  mongoose.models.Menu || model('Menu', menuSchema);



