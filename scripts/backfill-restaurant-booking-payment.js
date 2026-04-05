/**
 * One-off: set paymentStatus = "unpaid" on restaurant bookings missing the field.
 * Run from Backend: node scripts/backfill-restaurant-booking-payment.js
 */
import path from "node:path";
import * as dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve("./src/config/.env.dev") });

import TableBookingModel from "../src/DB/Model/bookingTable.model.js";

const rawDbUrl = process.env.DB_URL?.trim();
const dbUrl =
  rawDbUrl?.startsWith("mongodb://") || rawDbUrl?.startsWith("mongodb+srv://")
    ? rawDbUrl
    : rawDbUrl
      ? `mongodb://${rawDbUrl}`
      : "";

async function main() {
  if (!dbUrl) {
    throw new Error("DB_URL is missing in src/config/.env.dev");
  }
  await mongoose.connect(dbUrl);
  const invalid = await TableBookingModel.countDocuments({
    paymentStatus: { $nin: ["unpaid", "paid", "refunded"] },
  });
  const missing = await TableBookingModel.countDocuments({
    $or: [{ paymentStatus: { $exists: false } }, { paymentStatus: null }],
  });

  const fixMissing = await TableBookingModel.updateMany(
    { $or: [{ paymentStatus: { $exists: false } }, { paymentStatus: null }] },
    { $set: { paymentStatus: "unpaid" } }
  );

  const fixInvalid = await TableBookingModel.updateMany(
    { paymentStatus: { $nin: ["unpaid", "paid", "refunded"] } },
    { $set: { paymentStatus: "unpaid" } }
  );

  console.log(
    JSON.stringify(
      {
        before: { missing, invalid },
        modified: fixMissing.modifiedCount + fixInvalid.modifiedCount,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
