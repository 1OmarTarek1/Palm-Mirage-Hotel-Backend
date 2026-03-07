import mongoose from "mongoose";

const connectDB = async () => {
  return await mongoose
    .connect(process.env.DB_URL)
    .then((res) => {
      console.log(`DB connection`);
    })
    .catch((err) => console.log(`fail to connect on DB`));
};

export default connectDB;
