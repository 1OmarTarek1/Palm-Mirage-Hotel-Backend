import path from "node:path";
import * as dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve("./src/config/.env.dev") });

import {
  genderTypes,
  providerTypes,
  roleTypes,
  userModel,
} from "../src/DB/Model/User.model.js";
import { RoomModel } from "../src/DB/Model/Room.model.js";
import { UserBooking } from "../src/DB/Model/UserBooking.model.js";

const rawDbUrl = process.env.DB_URL?.trim();
const dbUrl =
  rawDbUrl?.startsWith("mongodb://") || rawDbUrl?.startsWith("mongodb+srv://")
    ? rawDbUrl
    : rawDbUrl
      ? `mongodb://${rawDbUrl}`
      : "";

const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;

const seedUserDefs = [
  ["Layla Nasser", "layla.nasser"],
  ["Youssef Sami", "youssef.sami"],
  ["Mariam Adel", "mariam.adel"],
  ["Karim Tamer", "karim.tamer"],
  ["Jana Mostafa", "jana.mostafa"],
  ["Ahmed Raafat", "ahmed.raafat"],
  ["Salma Hany", "salma.hany"],
  ["Omar Wael", "omar.wael"],
  ["Nadine Khaled", "nadine.khaled"],
  ["Hossam Fekry", "hossam.fekry"],
  ["Farah Emad", "farah.emad"],
  ["Malak Sherif", "malak.sherif"],
  ["Seif Maged", "seif.maged"],
  ["Mina George", "mina.george"],
  ["Reem Ashraf", "reem.ashraf"],
  ["Taha Samir", "taha.samir"],
  ["Nour Yassin", "nour.yassin"],
  ["Habiba Fares", "habiba.fares"],
  ["Ziad Fouad", "ziad.fouad"],
  ["Dina Ragab", "dina.ragab"],
];

const scenarioTemplates = [
  {
    status: "pending",
    paymentStatus: "unpaid",
    paymentMethod: "online",
    startOffset: 1,
    duration: 2,
    guests: 2,
    specialRequests: "Awaiting confirmation from reservations desk",
  },
  {
    status: "pending",
    paymentStatus: "unpaid",
    paymentMethod: "cash",
    startOffset: 2,
    duration: 3,
    guests: 1,
    specialRequests: "Guest requested airport transfer confirmation",
  },
  {
    status: "confirmed",
    paymentStatus: "paid",
    paymentMethod: "card",
    startOffset: 0,
    duration: 2,
    guests: 2,
    specialRequests: "Today arrival with late check-in note",
  },
  {
    status: "confirmed",
    paymentStatus: "paid",
    paymentMethod: "online",
    startOffset: 3,
    duration: 4,
    guests: 3,
    specialRequests: "Confirmed family stay with connected rooms request",
  },
  {
    status: "checked-in",
    paymentStatus: "paid",
    paymentMethod: "card",
    startOffset: -1,
    duration: 3,
    guests: 2,
    specialRequests: "Currently in house, extra towels requested",
  },
  {
    status: "checked-in",
    paymentStatus: "paid",
    paymentMethod: "cash",
    startOffset: -2,
    duration: 4,
    guests: 1,
    specialRequests: "VIP guest already checked in",
  },
  {
    status: "completed",
    paymentStatus: "paid",
    paymentMethod: "card",
    startOffset: -7,
    duration: 2,
    guests: 2,
    specialRequests: "Completed short stay for reporting history",
  },
  {
    status: "completed",
    paymentStatus: "paid",
    paymentMethod: "online",
    startOffset: -10,
    duration: 5,
    guests: 4,
    specialRequests: "Completed long family booking",
  },
  {
    status: "cancelled",
    paymentStatus: "refunded",
    paymentMethod: "online",
    startOffset: 4,
    duration: 3,
    guests: 2,
    specialRequests: "Cancelled after schedule change",
    cancellationReason: "Guest flight was rescheduled",
  },
  {
    status: "cancelled",
    paymentStatus: "refunded",
    paymentMethod: "card",
    startOffset: 6,
    duration: 2,
    guests: 1,
    specialRequests: "Cancelled booking created for refund flow testing",
    cancellationReason: "Guest requested full refund",
  },
  {
    status: "no-show",
    paymentStatus: "paid",
    paymentMethod: "online",
    startOffset: -1,
    duration: 2,
    guests: 2,
    specialRequests: "No-show scenario for front desk review",
    cancellationReason: "Guest never arrived before cutoff time",
  },
  {
    status: "no-show",
    paymentStatus: "unpaid",
    paymentMethod: "cash",
    startOffset: -2,
    duration: 1,
    guests: 1,
    specialRequests: "No-show with unpaid balance",
    cancellationReason: "Guest unreachable on arrival day",
  },
  {
    status: "confirmed",
    paymentStatus: "unpaid",
    paymentMethod: "cash",
    startOffset: 1,
    duration: 1,
    guests: 1,
    specialRequests: "Confirmed arrival with unpaid cash settlement",
  },
  {
    status: "confirmed",
    paymentStatus: "paid",
    paymentMethod: "online",
    startOffset: 8,
    duration: 5,
    guests: 2,
    specialRequests: "Future booking for occupancy planning",
  },
];

function addDays(baseDate, days, hour = 14, minute = 0) {
  const date = new Date(baseDate.getTime() + days * dayMs);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function getPricePerNight(room) {
  return Number(room.finalPrice || room.price || 0);
}

function getSeedEmail(handle) {
  return `seed.booking.${handle}@palmmirage.test`;
}

async function ensureSeedUsers() {
  const users = [];

  for (let index = 0; index < seedUserDefs.length; index += 1) {
    const [userName, handle] = seedUserDefs[index];
    const email = getSeedEmail(handle);
    const existing = await userModel.findOne({ email });

    if (existing) {
      users.push(existing);
      continue;
    }

    const created = await userModel.create({
      userName,
      country: "Egypt",
      email,
      password: "User123!",
      gender: index % 2 === 0 ? genderTypes.female : genderTypes.male,
      role: roleTypes.user,
      provider: providerTypes.system,
      isConfirmed: true,
      phoneNumber: `+20115555${String(index).padStart(4, "0")}`,
      DOB: new Date(1990 + (index % 8), index % 12, 5 + (index % 20)),
    });

    users.push(created);
  }

  return users;
}

async function clearPreviousSeedBookings(seedUsers) {
  await UserBooking.deleteMany({
    user: { $in: seedUsers.map((user) => user._id) },
  });
}

function buildBookingDocs(users, rooms) {
  const docs = [];

  for (let index = 0; index < 42; index += 1) {
    const template = scenarioTemplates[index % scenarioTemplates.length];
    const room = rooms[index % rooms.length];
    const user = users[index % users.length];
    const roomCapacity = Math.max(Number(room.capacity || 1), 1);
    const guests = Math.min(template.guests + (index % 2 === 0 ? 0 : 1), roomCapacity);
    const stagger = Math.floor(index / rooms.length);
    const checkInDate = addDays(now, template.startOffset + stagger, 14 - (index % 3), 0);
    const checkOutDate = addDays(checkInDate, template.duration, 12, 0);
    const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / dayMs));
    const pricePerNight = getPricePerNight(room);

    docs.push({
      user: user._id,
      room: room._id,
      checkInDate,
      checkOutDate,
      nights,
      pricePerNight,
      totalPrice: nights * pricePerNight,
      guests,
      status: template.status,
      paymentStatus: template.paymentStatus,
      paymentMethod: template.paymentMethod,
      specialRequests: `[Seed Scenario] ${template.specialRequests}`,
      cancellationReason: template.cancellationReason || "",
      bookedAt: addDays(now, template.startOffset - 5 - stagger, 11, 30),
    });
  }

  return docs;
}

function summarizeBookings(bookings) {
  return bookings.reduce(
    (summary, booking) => {
      summary.byStatus[booking.status] = (summary.byStatus[booking.status] || 0) + 1;
      summary.byPayment[booking.paymentStatus] = (summary.byPayment[booking.paymentStatus] || 0) + 1;
      return summary;
    },
    { byStatus: {}, byPayment: {} }
  );
}

async function main() {
  if (!dbUrl) {
    throw new Error("DB_URL is missing in src/config/.env.dev");
  }

  await mongoose.connect(dbUrl);
  console.log(`Connected to ${dbUrl}`);

  const rooms = await RoomModel.find().sort({ roomNumber: 1 });
  if (rooms.length === 0) {
    throw new Error("No rooms found. Seed rooms first before seeding room bookings.");
  }

  const seedUsers = await ensureSeedUsers();
  await clearPreviousSeedBookings(seedUsers);

  const bookingDocs = buildBookingDocs(seedUsers, rooms);
  const created = await UserBooking.insertMany(bookingDocs);
  const summary = summarizeBookings(created);

  console.log("Room booking stress seed completed successfully.");
  console.log(
    JSON.stringify(
      {
        insertedBookings: created.length,
        seedUsers: seedUsers.length,
        roomsUsed: rooms.length,
        statusBreakdown: summary.byStatus,
        paymentBreakdown: summary.byPayment,
        notePrefix: "[Seed Scenario]",
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Room booking seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
