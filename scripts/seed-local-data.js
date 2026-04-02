import path from "node:path";
import * as dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve("./src/config/.env.dev") });

import { userModel, roleTypes, providerTypes, genderTypes } from "../src/DB/Model/User.model.js";
import { FacilityModel } from "../src/DB/Model/Facility.model.js";
import { RoomModel } from "../src/DB/Model/Room.model.js";
import { UserBooking } from "../src/DB/Model/UserBooking.model.js";
import { TableModel } from "../src/DB/Model/table.model.js";
import TableBookingModel from "../src/DB/Model/bookingTable.model.js";
import Category from "../src/DB/Model/Category.model.js";
import { menuModel } from "../src/DB/Model/Menu.model.js";
import { activityModel } from "../src/DB/Model/Activity.model.js";
import { activityScheduleModel } from "../src/DB/Model/ActivitySchedule.model.js";
import { activityBookingModel } from "../src/DB/Model/ActivityBooking.model.js";
import { hotelModel } from "../src/DB/Model/Hotel.model.js";

const rawDbUrl = process.env.DB_URL?.trim();
const dbUrl =
  rawDbUrl?.startsWith("mongodb://") || rawDbUrl?.startsWith("mongodb+srv://")
    ? rawDbUrl
    : rawDbUrl
      ? `mongodb://${rawDbUrl}`
      : "";

const now = new Date();
const day = 24 * 60 * 60 * 1000;

const image = (label) =>
  `https://placehold.co/1200x800/png?text=${encodeURIComponent(label)}`;

function plusDays(days, hour = 12) {
  const date = new Date(now.getTime() + days * day);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function resetCollections() {
  await Promise.all([
    activityBookingModel.deleteMany({}),
    activityScheduleModel.deleteMany({}),
    activityModel.deleteMany({}),
    menuModel.deleteMany({}),
    Category.deleteMany({}),
    TableBookingModel.deleteMany({}),
    TableModel.deleteMany({}),
    UserBooking.deleteMany({}),
    RoomModel.deleteMany({}),
    FacilityModel.deleteMany({}),
    hotelModel.deleteMany({}),
    userModel.deleteMany({}),
  ]);
}

async function seedUsers() {
  return userModel.create([
    {
      userName: "Admin Local",
      country: "Egypt",
      email: "admin.local@palmhotel.com",
      password: "Admin123!",
      provider: providerTypes.system,
      gender: genderTypes.male,
      role: roleTypes.admin,
      phoneNumber: "+201001110000",
      isConfirmed: true,
    },
    {
      userName: "Sara Hassan",
      country: "Egypt",
      email: "sara.hassan@palmhotel.com",
      password: "User123!",
      provider: providerTypes.system,
      gender: genderTypes.female,
      role: roleTypes.user,
      phoneNumber: "+201001110001",
      isConfirmed: true,
    },
    {
      userName: "Omar Adel",
      country: "Egypt",
      email: "omar.adel@palmhotel.com",
      password: "User123!",
      provider: providerTypes.system,
      gender: genderTypes.male,
      role: roleTypes.user,
      phoneNumber: "+201001110002",
      isConfirmed: true,
    },
    {
      userName: "Mona Ali",
      country: "Egypt",
      email: "mona.ali@palmhotel.com",
      password: "User123!",
      provider: providerTypes.system,
      gender: genderTypes.female,
      role: roleTypes.user,
      phoneNumber: "+201001110003",
      isConfirmed: true,
    },
  ]);
}

async function seedFacilities() {
  return FacilityModel.create([
    { name: "WiFi", icon: "Wifi" },
    { name: "Air Conditioning", icon: "AirVent" },
    { name: "Breakfast", icon: "Coffee" },
    { name: "Pool Access", icon: "Waves" },
    { name: "Spa", icon: "Sparkles" },
    { name: "Mini Bar", icon: "GlassWater" },
  ]);
}

async function seedRooms(facilities) {
  const sharedFacilities = facilities.map((facility) => facility._id);

  return RoomModel.create([
    {
      roomName: "Nile Deluxe Suite",
      roomNumber: 101,
      roomType: "deluxe",
      price: 4200,
      capacity: 2,
      discount: 10,
      description: "Spacious suite with a panoramic Nile view and a quiet lounge corner.",
      facilities: sharedFacilities.slice(0, 5),
      roomImages: [{ secure_url: image("Room 101"), public_id: "room-101" }],
      hasOffer: true,
      isAvailable: true,
      floor: 1,
      rating: 4.8,
      reviewsCount: 42,
      viewsCount: 310,
      checkInTime: "14:00",
      checkOutTime: "12:00",
      cancellationPolicy: "Free cancellation up to 48 hours before arrival.",
    },
    {
      roomName: "Palm Family Room",
      roomNumber: 205,
      roomType: "family",
      price: 5600,
      capacity: 4,
      discount: 5,
      description: "Large family room with two sleeping zones and a balcony.",
      facilities: sharedFacilities.slice(0, 4),
      roomImages: [{ secure_url: image("Room 205"), public_id: "room-205" }],
      hasOffer: true,
      isAvailable: true,
      floor: 2,
      rating: 4.6,
      reviewsCount: 28,
      viewsCount: 205,
      cancellationPolicy: "Free cancellation up to 72 hours before arrival.",
    },
    {
      roomName: "Classic Twin Escape",
      roomNumber: 309,
      roomType: "twin",
      price: 3100,
      capacity: 2,
      discount: 0,
      description: "Comfortable twin room ideal for friends or business travelers.",
      facilities: sharedFacilities.slice(0, 3),
      roomImages: [{ secure_url: image("Room 309"), public_id: "room-309" }],
      hasOffer: false,
      isAvailable: true,
      floor: 3,
      rating: 4.3,
      reviewsCount: 17,
      viewsCount: 128,
      cancellationPolicy: "Non-refundable after confirmation.",
    },
  ]);
}

async function seedRoomBookings(users, rooms) {
  return UserBooking.create([
    {
      user: users[1]._id,
      room: rooms[0]._id,
      checkInDate: plusDays(2),
      checkOutDate: plusDays(5),
      totalPrice: 11340,
      guests: 2,
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "card",
      specialRequests: "High floor if available",
    },
    {
      user: users[2]._id,
      room: rooms[1]._id,
      checkInDate: plusDays(4),
      checkOutDate: plusDays(7),
      totalPrice: 15960,
      guests: 3,
      status: "pending",
      paymentStatus: "unpaid",
      paymentMethod: "online",
      specialRequests: "Baby crib needed",
    },
    {
      user: users[3]._id,
      room: rooms[2]._id,
      checkInDate: plusDays(1),
      checkOutDate: plusDays(3),
      totalPrice: 6200,
      guests: 2,
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "cash",
      specialRequests: "Late checkout if possible",
    },
  ]);
}

async function seedTables() {
  return TableModel.create([
    { number: 1, chairs: 2 },
    { number: 2, chairs: 4 },
    { number: 3, chairs: 4 },
    { number: 4, chairs: 6 },
    { number: 5, chairs: 8 },
  ]);
}

async function seedTableBookings(users, tables) {
  return TableBookingModel.create([
    {
      tableNumber: tables[1].number,
      user: users[1]._id,
      startTime: plusDays(1, 19),
      endTime: new Date(plusDays(1, 19).getTime() + 2 * 60 * 60 * 1000),
      guests: 4,
      status: "confirmed",
    },
    {
      tableNumber: tables[3].number,
      user: users[2]._id,
      startTime: plusDays(2, 20),
      endTime: new Date(plusDays(2, 20).getTime() + 2 * 60 * 60 * 1000),
      guests: 5,
      status: "confirmed",
    },
    {
      tableNumber: null,
      user: users[3]._id,
      startTime: plusDays(2, 20),
      endTime: new Date(plusDays(2, 20).getTime() + 2 * 60 * 60 * 1000),
      guests: 2,
      status: "pending",
    },
  ]);
}

async function seedCategories() {
  return Category.create([
    { label: "Appetizer", icon: "Salad", heroImg: image("Appetizers") },
    { label: "Restaurant", icon: "UtensilsCrossed", heroImg: image("Restaurant") },
    { label: "Desserts", icon: "CakeSlice", heroImg: image("Desserts") },
    { label: "Drinks", icon: "GlassWater", heroImg: image("Drinks") },
  ]);
}

async function seedMenu(adminUser, categories) {
  const categoryMap = Object.fromEntries(categories.map((category) => [category.label, category]));

  return menuModel.create([
    {
      name: "Stuffed Vine Leaves",
      description: "Traditional stuffed vine leaves with herbs, rice, and lemon.",
      price: 140,
      category: "Appetizer",
      categoryIcon: categoryMap.Appetizer.icon,
      categoryHeroImg: categoryMap.Appetizer.heroImg,
      image: image("Stuffed Vine Leaves"),
      available: true,
      createdBy: adminUser._id,
    },
    {
      name: "Mixed Grill Platter",
      description: "Tender kofta, chicken, and beef served with oriental rice.",
      price: 390,
      category: "Restaurant",
      categoryIcon: categoryMap.Restaurant.icon,
      categoryHeroImg: categoryMap.Restaurant.heroImg,
      image: image("Mixed Grill"),
      available: true,
      createdBy: adminUser._id,
    },
    {
      name: "Basbousa Delight",
      description: "Soft semolina cake soaked in syrup and topped with nuts.",
      price: 110,
      category: "Desserts",
      categoryIcon: categoryMap.Desserts.icon,
      categoryHeroImg: categoryMap.Desserts.heroImg,
      image: image("Basbousa"),
      available: true,
      createdBy: adminUser._id,
    },
    {
      name: "Fresh Hibiscus Cooler",
      description: "Cold hibiscus drink with mint and citrus notes.",
      price: 85,
      category: "Drinks",
      categoryIcon: categoryMap.Drinks.icon,
      categoryHeroImg: categoryMap.Drinks.heroImg,
      image: image("Hibiscus Cooler"),
      available: true,
      createdBy: adminUser._id,
    },
  ]);
}

async function seedActivities(adminUser) {
  return activityModel.create([
    {
      category: "balloon",
      label: "Above the Ancients",
      title: "Hot Air Balloon Rides",
      description: "Sunrise balloon flights with panoramic views over Luxor's temples and fields.",
      image: { secure_url: image("Balloon Ride"), public_id: "activity-balloon" },
      stats: [
        { value: "3 hrs", label: "Duration" },
        { value: "24", label: "Seats" },
      ],
      highlights: ["Sunrise departure", "Hotel pickup", "Professional guide"],
      icon: "CloudSun",
      location: "Luxor West Bank",
      basePrice: 220,
      pricingType: "per_person",
      durationMinutes: 180,
      defaultCapacity: 24,
      isActive: true,
      createdBy: adminUser._id,
    },
    {
      category: "cultural",
      label: "Immerse in Tradition",
      title: "Cultural Experiences",
      description: "Hands-on local culture sessions featuring food, crafts, and storytelling.",
      image: { secure_url: image("Cultural Experience"), public_id: "activity-cultural" },
      stats: [
        { value: "2 hrs", label: "Duration" },
        { value: "12", label: "Seats" },
      ],
      highlights: ["Local host", "Family friendly", "Traditional snacks"],
      icon: "Palette",
      location: "Palm Mirage Lounge",
      basePrice: 95,
      pricingType: "per_person",
      durationMinutes: 120,
      defaultCapacity: 12,
      isActive: true,
      createdBy: adminUser._id,
    },
    {
      category: "nile",
      label: "Sail Into Sunset",
      title: "Private Nile Sunset Cruise",
      description: "A serene evening sail with music, drinks, and views across the Nile.",
      image: { secure_url: image("Sunset Cruise"), public_id: "activity-cruise" },
      stats: [
        { value: "90 min", label: "Duration" },
        { value: "6", label: "Group Size" },
      ],
      highlights: ["Private boat", "Welcome drinks", "Golden hour views"],
      icon: "Ship",
      location: "Nile Marina",
      basePrice: 650,
      pricingType: "per_group",
      durationMinutes: 90,
      defaultCapacity: 6,
      isActive: true,
      createdBy: adminUser._id,
    },
  ]);
}

async function seedActivitySchedules(adminUser, activities) {
  return activityScheduleModel.create([
    {
      activity: activities[0]._id,
      date: plusDays(3, 5),
      startTime: "04:30",
      endTime: "07:30",
      capacity: 24,
      availableSeats: 18,
      priceOverride: 240,
      status: "scheduled",
      notes: "Meet in lobby 30 minutes before departure.",
      createdBy: adminUser._id,
    },
    {
      activity: activities[1]._id,
      date: plusDays(4, 17),
      startTime: "17:00",
      endTime: "19:00",
      capacity: 12,
      availableSeats: 8,
      status: "scheduled",
      notes: "Includes tea and traditional desserts.",
      createdBy: adminUser._id,
    },
    {
      activity: activities[2]._id,
      date: plusDays(5, 18),
      startTime: "18:00",
      endTime: "19:30",
      capacity: 6,
      availableSeats: 4,
      status: "scheduled",
      notes: "Perfect for couples and small groups.",
      createdBy: adminUser._id,
    },
  ]);
}

async function seedActivityBookings(users, activities, schedules) {
  return activityBookingModel.create([
    {
      user: users[1]._id,
      activity: activities[0]._id,
      schedule: schedules[0]._id,
      guests: 2,
      unitPrice: 240,
      totalPrice: 480,
      pricingType: "per_person",
      bookingDate: schedules[0].date,
      startTime: schedules[0].startTime,
      endTime: schedules[0].endTime,
      status: "pending",
      paymentStatus: "unpaid",
      contactPhone: "+201001110001",
      notes: "Window side if possible",
    },
    {
      user: users[2]._id,
      activity: activities[1]._id,
      schedule: schedules[1]._id,
      guests: 2,
      unitPrice: 95,
      totalPrice: 190,
      pricingType: "per_person",
      bookingDate: schedules[1].date,
      startTime: schedules[1].startTime,
      endTime: schedules[1].endTime,
      status: "cancelled",
      paymentStatus: "unpaid",
      contactPhone: "+201001110002",
      notes: "Vegetarian snacks please",
      cancellationReason: "Travel plan changed",
    },
    {
      user: users[3]._id,
      activity: activities[2]._id,
      schedule: schedules[2]._id,
      guests: 1,
      unitPrice: 650,
      totalPrice: 650,
      pricingType: "per_group",
      bookingDate: schedules[2].date,
      startTime: schedules[2].startTime,
      endTime: schedules[2].endTime,
      status: "confirmed",
      paymentStatus: "paid",
      contactPhone: "+201001110003",
      notes: "Anniversary setup inquiry",
    },
  ]);
}

async function seedHotels() {
  return hotelModel.create([
    {
      name: "Palm Mirage Hotel",
      Location: "Luxor, Egypt",
      Gid: 1,
    },
  ]);
}

async function main() {
  if (!dbUrl) {
    throw new Error("DB_URL is missing in src/config/.env.dev");
  }

  await mongoose.connect(dbUrl);
  console.log(`Connected to ${dbUrl}`);

  await resetCollections();

  const users = await seedUsers();
  const facilities = await seedFacilities();
  const rooms = await seedRooms(facilities);
  const roomBookings = await seedRoomBookings(users, rooms);
  const tables = await seedTables();
  const tableBookings = await seedTableBookings(users, tables);
  const categories = await seedCategories();
  const menuItems = await seedMenu(users[0], categories);
  const activities = await seedActivities(users[0]);
  const schedules = await seedActivitySchedules(users[0], activities);
  const activityBookings = await seedActivityBookings(users, activities, schedules);
  const hotels = await seedHotels();

  console.log("Local seed completed successfully.");
  console.log(
    JSON.stringify(
      {
        users: users.length,
        facilities: facilities.length,
        rooms: rooms.length,
        roomBookings: roomBookings.length,
        tables: tables.length,
        tableBookings: tableBookings.length,
        categories: categories.length,
        menuItems: menuItems.length,
        activities: activities.length,
        schedules: schedules.length,
        activityBookings: activityBookings.length,
        hotels: hotels.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
