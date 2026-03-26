import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.cloud_name || "dtypn50vu",
  api_key: process.env.api_key || "693969356268288",
  api_secret: process.env.api_secret || "onJUtVqc7fB1OlbjXGYdQmKFJdU",
});

export default cloudinary;
