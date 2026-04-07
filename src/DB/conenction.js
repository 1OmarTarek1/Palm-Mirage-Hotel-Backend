import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

const connectDB = async () => {
  const rawDbUrl = process.env.DB_URL?.trim();
  const normalizedDbUrl = rawDbUrl?.startsWith("mongodb://") || rawDbUrl?.startsWith("mongodb+srv://")
    ? rawDbUrl
    : rawDbUrl
      ? `mongodb://${rawDbUrl}`
      : "";

  if (!normalizedDbUrl) {
    throw new Error("DB_URL is missing. Please configure it in src/config/.env.dev");
  }

  mongoose.set("bufferCommands", false);

  await mongoose.connect(normalizedDbUrl, {
    serverSelectionTimeoutMS: 10000,
  });
  logger.info("DB connected");
};

export default connectDB;
