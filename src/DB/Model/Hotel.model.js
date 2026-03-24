import { model, Schema } from "mongoose";

export const hotelschema = new Schema(
  {
    name: {
      type: String,
    },
    Location: {
      type: String,
    },
    Gid: {
        type:Number
    },
  },
  { timestamps: true }
);



export const hotelModel = mongoose.models.hotel || model("hotel", hotelModel);