import mongoose from "mongoose";

const connectDB = async () => {
  const rawDbUrl = process.env.DB_URL?.trim();
  const normalizedDbUrl = rawDbUrl?.startsWith("mongodb://") || rawDbUrl?.startsWith("mongodb+srv://")
    ? rawDbUrl
    : rawDbUrl
      ? `mongodb://${rawDbUrl}`
      : "";

  return await mongoose
    .connect(normalizedDbUrl)
    .then((res) => {
      console.log(`DB connection`);
    })
    .catch((err) => console.log(`fail to connect on DB: ${err.message}`));
};

export default connectDB;
