import mongoose, { Schema, model } from "mongoose";

const facilitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    icon: {
      type: String,
      unique: true,
    },

    category: {
      type: String,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Facility || model("Facility", facilitySchema);
