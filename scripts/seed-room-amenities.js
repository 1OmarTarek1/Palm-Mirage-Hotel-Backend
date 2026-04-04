import path from "node:path";
import * as dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve("./src/config/.env.dev") });

import { RoomAmenityModel } from "../src/DB/Model/RoomAmenity.model.js";

const rawDbUrl = process.env.DB_URL?.trim();
const dbUrl =
  rawDbUrl?.startsWith("mongodb://") || rawDbUrl?.startsWith("mongodb+srv://")
    ? rawDbUrl
    : rawDbUrl
      ? `mongodb://${rawDbUrl}`
      : "";

const baseAmenities = [
  {
    name: "High-Speed Wi-Fi",
    icon: "Wifi",
    description: "Fast and reliable wireless internet access in the room.",
  },
  {
    name: "Air Conditioning",
    icon: "Wind",
    description: "Individually controlled air conditioning for guest comfort.",
  },
  {
    name: "Smart TV",
    icon: "Tv",
    description: "Flat-screen smart television with satellite entertainment.",
  },
  {
    name: "Mini Bar",
    icon: "Refrigerator",
    description: "In-room minibar with chilled drinks and snacks.",
  },
  {
    name: "Coffee Station",
    icon: "Coffee",
    description: "Tea and coffee setup for in-room refreshment.",
  },
  {
    name: "Private Bathroom",
    icon: "Bath",
    description: "Private bathroom with shower essentials and fresh towels.",
  },
  {
    name: "Electronic Safe",
    icon: "Lock",
    description: "Secure in-room safe for valuables and documents.",
  },
  {
    name: "Direct Dial Phone",
    icon: "Phone",
    description: "Direct dial telephone for reception and outside calls.",
  },
  {
    name: "Work Desk",
    icon: "Monitor",
    description: "Comfortable desk area suited for business or remote work.",
  },
  {
    name: "Balcony",
    icon: "Umbrella",
    description: "Private balcony with open-air seating space.",
  },
  {
    name: "Daily Housekeeping",
    icon: "Shirt",
    description: "Daily housekeeping service to refresh the room.",
  },
  {
    name: "Rain Shower",
    icon: "Droplets",
    description: "Walk-in rain shower for an upgraded bathroom experience.",
  },
];

function normalizeName(name = "") {
  return name.trim().replace(/\s+/g, " ");
}

async function main() {
  if (!dbUrl) {
    throw new Error("DB_URL is missing in src/config/.env.dev");
  }

  await mongoose.connect(dbUrl);
  console.log(`Connected to ${dbUrl}`);

  const upsertResults = await Promise.all(
    baseAmenities.map(async (amenity) => {
      const name = normalizeName(amenity.name);
      const existing = await RoomAmenityModel.findOne({
        name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });

      if (existing) {
        existing.icon = amenity.icon;
        existing.description = amenity.description;
        await existing.save();
        return { action: "updated", name: existing.name };
      }

      const created = await RoomAmenityModel.create({
        name,
        icon: amenity.icon,
        description: amenity.description,
      });

      return { action: "created", name: created.name };
    })
  );

  const summary = upsertResults.reduce(
    (acc, item) => {
      acc[item.action] += 1;
      return acc;
    },
    { created: 0, updated: 0 }
  );

  console.log("Room amenities seed completed successfully.");
  console.log(
    JSON.stringify(
      {
        totalProcessed: upsertResults.length,
        ...summary,
        amenities: upsertResults.map((item) => item.name),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Room amenities seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
