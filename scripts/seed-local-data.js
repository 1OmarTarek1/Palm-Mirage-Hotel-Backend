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
const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const u = (id, w = 1600, h = 1000) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
const face = (type, id) => `https://randomuser.me/api/portraits/${type}/${id}.jpg`;
const addDays = (days, hour = 12, minute = 0) => {
  const date = new Date(now.getTime() + days * dayMs);
  date.setHours(hour, minute, 0, 0);
  return date;
};
const addHours = (date, hours) => new Date(date.getTime() + hours * hourMs);
const time = (hour, minute = 0) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

const roomImages = [
  u("photo-1505693416388-ac5ce068fe85"),
  u("photo-1522708323590-d24dbb6b0267"),
  u("photo-1496417263034-38ec4f0b665a"),
  u("photo-1502672260266-1c1ef2d93688"),
  u("photo-1512918728675-ed5a9ecdebfd"),
  u("photo-1505692952047-1a78307da8f2"),
];

const categoryImages = {
  Appetizer: u("photo-1540189549336-e6e99c3679fe"),
  Restaurant: u("photo-1555939594-58d7cb561ad1"),
  Desserts: u("photo-1551024601-bec78aea704b"),
  Drinks: u("photo-1513558161293-cdaf765ed2fd"),
};

const activityImages = {
  balloon: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Balloon%20over%20Luxor%20-%20Egypt%20denoised.jpg",
  nile: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Nile%20Feluccas%20in%20Aswan.jpg",
  heritage: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Luxor%2C%20Egypt%2C%20Karnak.jpg",
  desert: "https://commons.wikimedia.org/wiki/Special:Redirect/file/DESERT%20SAFARI.jpg",
  cultural: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&h=1000&q=80",
  culinary: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Egyptian%20food%20Koshary.jpg",
};

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
  const defs = [
    ["Admin Local", "Egypt", "admin.local@palmhotel.com", "Admin123!", genderTypes.male, roleTypes.admin, "+201001110000", face("men", 12)],
    ["Omar Tarek", "Egypt", "cr7omartarek@gmail.com", "moAhmed123", genderTypes.male, roleTypes.user, "+201001110099", face("men", 32)],
    ["Nour Hassan", "Egypt", "nour.hassan@example.com", "User123!", genderTypes.female, roleTypes.user, "+201001110001", face("women", 21)],
    ["Omar Adel", "Egypt", "omar.adel@example.com", "User123!", genderTypes.male, roleTypes.user, "+201001110002", face("men", 22)],
    ["Mona Ali", "Egypt", "mona.ali@example.com", "User123!", genderTypes.female, roleTypes.user, "+201001110003", face("women", 23)],
    ["Youssef Nabil", "Egypt", "youssef.nabil@example.com", "User123!", genderTypes.male, roleTypes.user, "+201001110004", face("men", 24)],
    ["Salma Wael", "Egypt", "salma.wael@example.com", "User123!", genderTypes.female, roleTypes.user, "+201001110005", face("women", 25)],
    ["Karim Fathy", "Egypt", "karim.fathy@example.com", "User123!", genderTypes.male, roleTypes.user, "+201001110006", face("men", 26)],
    ["Farah Samir", "Egypt", "farah.samir@example.com", "User123!", genderTypes.female, roleTypes.user, "+201001110007", face("women", 26)],
    ["Ahmed Tarek", "Egypt", "ahmed.tarek@example.com", "User123!", genderTypes.male, roleTypes.user, "+201001110008", face("men", 27)],
    ["Aya Mostafa", "Egypt", "aya.mostafa@example.com", "User123!", genderTypes.female, roleTypes.user, "+201001110009", face("women", 27)],
    ["Layla Hussein", "UAE", "layla.hussein@example.com", "User123!", genderTypes.female, roleTypes.user, "+971501230001", face("women", 28)],
    ["Samir Khaled", "Jordan", "samir.khaled@example.com", "User123!", genderTypes.male, roleTypes.user, "+962790000001", face("men", 28)],
    ["Rana Ibrahim", "Saudi Arabia", "rana.ibrahim@example.com", "User123!", genderTypes.female, roleTypes.user, "+966551230001", face("women", 29)],
    ["Tamer Hany", "Egypt", "tamer.hany@example.com", "User123!", genderTypes.male, roleTypes.user, "+201001110010", face("men", 29)],
    ["Hana Magdy", "Egypt", "hana.magdy@example.com", "User123!", genderTypes.female, roleTypes.user, "+201001110011", face("women", 30)],
    ["Mostafa Ashraf", "Egypt", "mostafa.ashraf@example.com", "User123!", genderTypes.male, roleTypes.user, "+201001110012", face("men", 30)],
  ];
  return userModel.create(
    defs.map(([userName, country, email, password, gender, role, phoneNumber, image], index) => ({
      userName, country, email, password, gender, role, phoneNumber, image,
      provider: providerTypes.system,
      isConfirmed: true,
      DOB: new Date(1989 + (index % 9), index % 12, 5 + (index % 20)),
    }))
  );
}

async function seedFacilities() {
  return FacilityModel.create([
    { name: "Infinity Pool", category: "Leisure", description: "Rooftop Nile-view pool.", location: "Roof Deck", capacity: 60, status: "Available", image: u("photo-1578683010236-d716f9a3f461"), icon: "Waves", operatingHours: "08:00 - 22:00" },
    { name: "Desert Bloom Spa", category: "Wellness", description: "Spa suites and massage rooms.", location: "Level 1", capacity: 18, status: "Available", image: u("photo-1519823551278-64ac92734fb1"), icon: "Sparkles", operatingHours: "10:00 - 23:00" },
    { name: "Palm Fit Gym", category: "Fitness", description: "Cardio and weights studio.", location: "Level 1", capacity: 25, status: "Available", image: u("photo-1534438327276-14e5300c3a48"), icon: "Dumbbell", operatingHours: "06:00 - 00:00" },
    { name: "Mirage Restaurant", category: "Dining", description: "Main all-day dining room.", location: "Ground Floor", capacity: 120, status: "Available", image: u("photo-1552566626-52f8b828add9"), icon: "UtensilsCrossed", operatingHours: "07:00 - 00:00" },
    { name: "Skyline Lounge", category: "Leisure", description: "Rooftop evening lounge.", location: "Roof Deck", capacity: 80, status: "Busy", image: u("photo-1506744038136-46273834b3fb"), icon: "MoonStar", operatingHours: "16:00 - 01:00" },
    { name: "Business Hub", category: "Business", description: "Meeting pods and printers.", location: "Mezzanine", capacity: 30, status: "Available", image: u("photo-1497366754035-f200968a6e72"), icon: "BriefcaseBusiness", operatingHours: "08:00 - 20:00" },
    { name: "Kids Corner", category: "Family", description: "Indoor play area.", location: "Ground Floor", capacity: 20, status: "Available", image: u("photo-1516627145497-ae6968895b74"), icon: "ToyBrick", operatingHours: "10:00 - 21:00" },
    { name: "Airport Shuttle", category: "Transport", description: "Scheduled airport transfer.", location: "Main Entrance", capacity: 14, status: "Available", image: u("photo-1503376780353-7e6692767b70"), icon: "Bus", operatingHours: "24/7 on request" },
    { name: "Private Beach Access", category: "Leisure", description: "Partner beach day access.", location: "Beach Club", capacity: 50, status: "Closed", image: u("photo-1507525428034-b723cf961d3e"), icon: "Sun", operatingHours: "09:00 - 18:00" },
    { name: "Laundry Express", category: "Service", description: "Same-day pressing and laundry.", location: "Service Basement", capacity: 200, status: "Available", image: u("photo-1517677208171-0bc6725a3e60"), icon: "Shirt", operatingHours: "08:00 - 22:00" },
  ]);
}

async function seedHotel() {
  return hotelModel.create({ name: "Palm Mirage Hotel", Location: "Luxor, Egypt", Gid: 1 });
}

async function seedRooms(facilities) {
  const facilityIds = facilities.map((facility) => facility._id);
  const defs = [
    ["Nile Deluxe Suite", 101, "deluxe", 4200, 2, 10, 1, 4.9, 124, 820, true],
    ["Palm Family Residence", 102, "family", 6100, 4, 8, 1, 4.8, 97, 640, true],
    ["Garden Single Retreat", 103, "single", 2200, 1, 0, 1, 4.3, 41, 210, false],
    ["Classic Twin Escape", 201, "twin", 3150, 2, 5, 2, 4.4, 68, 334, true],
    ["Sunset Double Premier", 202, "double", 3550, 2, 7, 2, 4.5, 76, 355, true],
    ["Executive Deluxe Corner", 203, "deluxe", 4700, 2, 12, 2, 4.9, 132, 905, true],
    ["Courtyard Twin Comfort", 204, "twin", 2950, 2, 0, 2, 4.1, 38, 190, false],
    ["Palm Signature Double", 205, "double", 3900, 2, 6, 2, 4.7, 84, 488, true],
    ["Royal Family Horizon", 301, "family", 6600, 5, 10, 3, 4.9, 109, 730, true],
    ["Heritage Single Studio", 302, "single", 2350, 1, 3, 3, 4.2, 22, 140, true],
    ["Mirage Deluxe Panorama", 303, "deluxe", 4950, 3, 9, 3, 4.8, 118, 689, true],
    ["Skyline Twin Select", 304, "twin", 3250, 2, 4, 3, 4.4, 46, 256, true],
  ];
  return RoomModel.create(
    defs.map(([roomName, roomNumber, roomType, price, capacity, discount, floor, rating, reviewsCount, viewsCount, hasOffer], index) => ({
      roomName, roomNumber, roomType, price, capacity, discount, floor, rating, reviewsCount, viewsCount, hasOffer,
      description: `${roomName} offers a polished stay experience with balanced comfort, calm lighting, and practical amenities.`,
      facilities: facilityIds.slice(index % 5, (index % 5) + 5),
      roomImages: [
        { secure_url: roomImages[index % roomImages.length], public_id: `room-${roomNumber}-cover` },
        { secure_url: roomImages[(index + 1) % roomImages.length], public_id: `room-${roomNumber}-alt` },
      ],
      isAvailable: index % 4 !== 0,
      checkInTime: "14:00",
      checkOutTime: "12:00",
      cancellationPolicy: index % 3 === 0 ? "Free cancellation up to 48 hours before arrival." : "Non-refundable after confirmation.",
    }))
  );
}

async function seedRoomBookings(users, rooms) {
  const defs = [
    [1, 0, 2, 5, 2, "confirmed", "paid", "card", "High floor and extra pillows"],
    [2, 1, 3, 6, 4, "confirmed", "paid", "online", "Baby crib and quiet room"],
    [3, 2, 1, 2, 1, "completed", "paid", "cash", "Early breakfast box"],
    [4, 3, 5, 8, 2, "pending", "unpaid", "online", "Late arrival after midnight"],
    [5, 4, 7, 10, 2, "confirmed", "paid", "card", "Anniversary setup"],
    [6, 5, -6, -3, 2, "completed", "paid", "card", "Airport pickup requested"],
    [7, 6, -10, -8, 2, "cancelled", "refunded", "online", "Flight changed"],
    [8, 7, 4, 7, 2, "confirmed", "paid", "card", "Near elevator"],
    [9, 8, 8, 11, 5, "pending", "unpaid", "cash", "Family room with crib"],
    [10, 9, 6, 9, 1, "confirmed", "paid", "online", "Non-smoking room"],
    [11, 10, -2, 1, 3, "confirmed", "paid", "card", "Extra towels"],
    [12, 11, 10, 13, 2, "pending", "unpaid", "online", "River view preferred"],
  ];

  return UserBooking.create(
    defs.map(([userIndex, roomIndex, startOffset, endOffset, guests, status, paymentStatus, paymentMethod, specialRequests]) => {
      const room = rooms[roomIndex];
      const checkInDate = addDays(startOffset, 14);
      const checkOutDate = addDays(endOffset, 12);
      const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / dayMs));
      return {
        user: users[userIndex]._id,
        room: room._id,
        checkInDate,
        checkOutDate,
        totalPrice: Math.round((room.finalPrice || room.price) * nights),
        guests,
        status,
        paymentStatus,
        paymentMethod,
        specialRequests,
      };
    })
  );
}

async function seedTables() {
  return TableModel.create(
    Array.from({ length: 16 }, (_, index) => ({
      number: index + 1,
      chairs: [2, 2, 4, 4, 4, 6, 6, 8][index % 8],
    }))
  );
}

async function seedTableBookings(users, tables) {
  const defs = [
    [1, 1, 1, 19, 2, 2, "confirmed"],
    [2, 2, 1, 20, 2, 4, "confirmed"],
    [3, 5, 2, 20, 2, 4, "confirmed"],
    [4, 7, 2, 21, 2, 6, "pending"],
    [5, 3, 3, 18, 2, 4, "completed"],
    [6, 9, 3, 19, 2, 2, "confirmed"],
    [7, 11, 4, 20, 2, 8, "confirmed"],
    [8, 4, -2, 19, 2, 4, "completed"],
    [9, 6, -1, 20, 2, 6, "cancelled"],
    [10, 8, 5, 21, 2, 2, "pending"],
  ];

  return TableBookingModel.create(
    defs.map(([userIndex, tableIndex, dayOffset, hour, durationHours, guests, status]) => {
      const startTime = addDays(dayOffset, hour);
      return {
        tableNumber: status === "pending" ? null : tables[tableIndex].number,
        user: users[userIndex]._id,
        startTime,
        endTime: addHours(startTime, durationHours),
        guests,
        status,
      };
    })
  );
}

async function seedCategories() {
  return Category.create([
    { label: "Appetizer", icon: "Salad", heroImg: categoryImages.Appetizer },
    { label: "Restaurant", icon: "UtensilsCrossed", heroImg: categoryImages.Restaurant },
    { label: "Desserts", icon: "CakeSlice", heroImg: categoryImages.Desserts },
    { label: "Drinks", icon: "GlassWater", heroImg: categoryImages.Drinks },
  ]);
}

async function seedMenu(adminUser, categories) {
  const categoryMap = Object.fromEntries(categories.map((category) => [category.label, category]));
  const defs = [
    ["Stuffed Vine Leaves", "Traditional vine leaves with herbed rice and lemon.", 145, "Appetizer", u("photo-1547592180-85f173990554")],
    ["Fattoush Bowl", "Crisp greens, toasted pita, and pomegranate dressing.", 125, "Appetizer", u("photo-1543332164-6e82f355badc")],
    ["Roasted Beet Burrata", "Roasted beetroot, burrata, citrus, and pistachio.", 165, "Appetizer", u("photo-1540189549336-e6e99c3679fe")],
    ["Oriental Mezze Board", "Hummus, baba ghanoush, muhammara, olives, and bread.", 210, "Appetizer", u("photo-1473093295043-cdd812d0e601")],
    ["Mixed Grill Platter", "Kofta, grilled chicken, lamb, and oriental rice.", 420, "Restaurant", u("photo-1555939594-58d7cb561ad1")],
    ["Nile Sea Bass", "Pan-seared sea bass with lemon butter and greens.", 445, "Restaurant", u("photo-1544025162-d76694265947")],
    ["Chicken Molokhia Rice", "Slow-cooked molokhia with oven-roasted chicken.", 295, "Restaurant", u("photo-1504674900247-0877df9cc836")],
    ["Beef Tenderloin Medallions", "Tenderloin with pepper sauce and rosemary potatoes.", 560, "Restaurant", u("photo-1467003909585-2f8a72700288")],
    ["Herb Risotto Primavera", "Creamy risotto with vegetables and basil oil.", 280, "Restaurant", u("photo-1517248135467-4c7edcad34c4")],
    ["Basbousa Delight", "Warm semolina cake with syrup and almonds.", 115, "Desserts", u("photo-1488477181946-6428a0291777")],
    ["Pistachio Kunafa Nest", "Crisp kunafa layered with sweet cheese.", 145, "Desserts", u("photo-1551024601-bec78aea704b")],
    ["Chocolate Date Fondant", "Soft-centered fondant finished with date caramel.", 165, "Desserts", u("photo-1519864600265-abb23847ef2c")],
    ["Seasonal Fruit Pavlova", "Crisp meringue with vanilla cream and fruit.", 150, "Desserts", u("photo-1563729784474-d77dbb933a9e")],
    ["Fresh Hibiscus Cooler", "Cold karkadeh infusion with mint and orange peel.", 85, "Drinks", u("photo-1513558161293-cdaf765ed2fd")],
    ["Mango Passion Mocktail", "Mango puree, passion fruit, and lime zest.", 95, "Drinks", u("photo-1499636136210-6f4ee915583e")],
    ["Palm Signature Latte", "House latte with cinnamon and cardamom.", 90, "Drinks", u("photo-1461823385004-d7660947a7c0")],
    ["Sunset Citrus Spritz", "Orange, grapefruit, tonic, and rosemary.", 98, "Drinks", u("photo-1502741338009-cac2772e18bc")],
  ];

  return menuModel.create(
    defs.map(([name, description, price, category, image], index) => ({
      name,
      description,
      price,
      category,
      categoryIcon: categoryMap[category].icon,
      categoryHeroImg: categoryMap[category].heroImg,
      image,
      available: index % 6 !== 1,
      createdBy: adminUser._id,
    }))
  );
}

async function seedActivities(adminUser) {
  const defs = [
    ["balloon", "Rise Above Luxor", "Sunrise Hot Air Balloon Ride", "Early morning balloon journey over Luxor's temples and farmland.", activityImages.balloon, "CloudSun", "Luxor West Bank", 240, "per_person", 180, 24, "3 hrs", "24"],
    ["nile", "Golden Hour Sailing", "Private Nile Sunset Cruise", "Private sunset sail with canapes, music, and a relaxed river atmosphere.", activityImages.nile, "Ship", "Palm Mirage Marina", 690, "per_group", 90, 6, "90 min", "6"],
    ["heritage", "Walk Through History", "Karnak and Luxor Heritage Tour", "Curated guided tour through iconic temple landmarks with hotel transfer.", activityImages.heritage, "Landmark", "Karnak Temple District", 180, "per_person", 240, 18, "4 hrs", "18"],
    ["desert", "Into the Dunes", "Desert Safari and Bedouin Dinner", "Late-afternoon desert safari ending with a Bedouin-style dinner under the stars.", activityImages.desert, "Mountain", "Western Desert Route", 320, "per_person", 300, 14, "5 hrs", "14"],
    ["cultural", "Meet Local Traditions", "Egyptian Culture Evening", "Interactive evening with storytelling, tea rituals, and folk music.", activityImages.cultural, "Palette", "Palm Mirage Lounge", 110, "per_person", 120, 20, "2 hrs", "20"],
    ["culinary", "Cook with the Chef", "Chef's Table Culinary Workshop", "Hands-on session preparing a curated Egyptian-inspired menu.", activityImages.culinary, "ChefHat", "Studio Kitchen", 260, "per_person", 150, 10, "150 min", "10"],
    ["nile", "Sail at Sunrise", "Morning Felucca Discovery", "A calm sunrise sail with tea service and scenic Nile banks.", activityImages.nile, "Ship", "Luxor Corniche", 160, "per_person", 75, 10, "75 min", "10"],
    ["heritage", "Timeless West Bank", "Valley of the Kings Explorer", "A guided visit to royal tombs and West Bank highlights.", activityImages.heritage, "Landmark", "Valley of the Kings", 210, "per_person", 300, 16, "5 hrs", "16"],
    ["desert", "Sunset Through Sand", "Quad Bike Desert Escape", "A high-energy desert route with lookout stops and refreshments.", activityImages.desert, "Mountain", "Desert Outskirts", 275, "per_person", 180, 12, "3 hrs", "12"],
    ["cultural", "Stories and Craft", "Nubian Music and Art Night", "Relaxed cultural night with live performance and handmade art corners.", activityImages.cultural, "Palette", "Cultural Courtyard", 95, "per_person", 100, 24, "100 min", "24"],
    ["culinary", "Taste of Luxor", "Egyptian Street Food Tasting", "Guided tasting menu inspired by classic Egyptian street food favorites.", activityImages.culinary, "ChefHat", "Palm Food Studio", 135, "per_person", 90, 14, "90 min", "14"],
    ["balloon", "Golden Skies", "Sunset Balloon Panorama", "A softer balloon experience with panoramic desert and river scenery.", activityImages.balloon, "CloudSun", "Luxor Launch Field", 285, "per_person", 150, 20, "150 min", "20"],
    ["nile", "Private River Moments", "Luxury Dinner Cruise on the Nile", "Evening dinner cruise with plated menu, soft music, and premium service.", activityImages.nile, "Ship", "Palm Private Dock", 890, "per_group", 120, 8, "2 hrs", "8"],
    ["heritage", "Temple by Night", "Luxor Temple Evening Visit", "A beautifully lit temple visit designed for cooler evening exploration.", activityImages.heritage, "Landmark", "Luxor Temple", 140, "per_person", 120, 22, "2 hrs", "22"],
    ["desert", "Stargazing Beyond the City", "Desert Stars Camp Experience", "A quiet stargazing trip with telescopes, warm drinks, and lounge seating.", activityImages.desert, "Mountain", "Open Desert Camp", 360, "per_person", 240, 18, "4 hrs", "18"],
    ["cultural", "Refined Local Encounters", "Traditional Tea and Storytelling Salon", "An intimate salon-style experience around Egyptian tea and local stories.", activityImages.cultural, "Palette", "Palm Library Lounge", 80, "per_person", 75, 16, "75 min", "16"],
    ["culinary", "Bake and Share", "Oriental Pastry Masterclass", "Small-group pastry class focused on kunafa, basbousa, and plating details.", activityImages.culinary, "ChefHat", "Pastry Atelier", 190, "per_person", 105, 12, "105 min", "12"],
    ["balloon", "First Light Adventure", "Family Balloon Morning Experience", "Family-friendly balloon ride with smoother pacing and early breakfast boxes.", activityImages.balloon, "CloudSun", "Luxor West Launch Zone", 230, "per_person", 165, 18, "165 min", "18"],
  ];

  return activityModel.create(
    defs.map(([category, label, title, description, image, icon, location, basePrice, pricingType, durationMinutes, defaultCapacity, statValue, seatValue]) => ({
      category,
      label,
      title,
      description,
      image: { secure_url: image, public_id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      attacthments: [
        { secure_url: image, public_id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-1` },
        { secure_url: image, public_id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-2` },
      ],
      stats: [
        { value: statValue, label: "Duration" },
        { value: seatValue, label: "Seats" },
      ],
      highlights: ["Hotel transfer", "Curated experience", "Professional host", "Photo-friendly route"],
      icon,
      location,
      basePrice,
      pricingType,
      durationMinutes,
      defaultCapacity,
      isActive: true,
      createdBy: adminUser._id,
    }))
  );
}

async function seedActivitySchedules(adminUser, activities) {
  const defs = [
    [0, 2, 5, 30, 3, 24, 18, 260, "scheduled", "Pickup starts 30 minutes before departure."],
    [0, 4, 5, 30, 3, 24, 0, 255, "full", "Popular sunrise slot, fully booked."],
    [0, 7, 5, 30, 3, 24, 10, 250, "scheduled", "Morning weather briefing included."],
    [1, 1, 18, 0, 1.5, 6, 3, 720, "scheduled", "Private route with onboard refreshments."],
    [1, 3, 18, 0, 1.5, 6, 2, 690, "scheduled", "Ideal for couples and small groups."],
    [1, 6, 18, 0, 1.5, 6, 6, 680, "scheduled", "Open evening departure."],
    [2, 2, 9, 0, 4, 18, 7, null, "scheduled", "Includes temple tickets and guide."],
    [2, 5, 9, 0, 4, 18, 12, 195, "scheduled", "Small-group comfort coach transfer."],
    [2, -4, 9, 0, 4, 18, 0, 180, "completed", "Completed tour kept for dashboard history."],
    [3, 3, 15, 30, 5, 14, 5, 335, "scheduled", "Dinner camp with folklore show."],
    [3, 8, 15, 30, 5, 14, 11, 320, "scheduled", "More relaxed dune route."],
    [4, 1, 17, 0, 2, 20, 12, null, "scheduled", "Traditional tea and calligraphy included."],
    [4, 7, 17, 0, 2, 20, 0, 105, "cancelled", "Cancelled due to private event booking."],
    [5, 2, 13, 0, 2.5, 10, 4, 280, "scheduled", "Hands-on session with tasting menu."],
    [5, 5, 13, 0, 2.5, 10, 0, 270, "full", "Full workshop with waiting list."],
  ];

  return activityScheduleModel.create(
    defs.map(([activityIndex, dayOffset, hour, minute, durationHours, capacity, availableSeats, priceOverride, status, notes]) => {
      const start = addDays(dayOffset, hour, minute);
      const end = addHours(start, durationHours);
      return {
        activity: activities[activityIndex]._id,
        date: start,
        startTime: time(hour, minute),
        endTime: time(end.getHours(), end.getMinutes()),
        capacity,
        availableSeats,
        priceOverride,
        status,
        notes,
        createdBy: adminUser._id,
      };
    })
  );
}

async function seedActivityBookings(users, activities, schedules) {
  const defs = [
    [1, 0, 0, 2, 260, "per_person", "confirmed", "paid", "+201001110001", "Window side basket if possible", ""],
    [2, 1, 3, 1, 720, "per_group", "confirmed", "paid", "+201001110002", "Anniversary setup requested", ""],
    [3, 2, 6, 3, 180, "per_person", "pending", "unpaid", "+201001110003", "Need Arabic-speaking guide", ""],
    [4, 3, 9, 2, 335, "per_person", "confirmed", "paid", "+201001110004", "Vegetarian dinner preferred", ""],
    [5, 4, 11, 4, 110, "per_person", "confirmed", "paid", "+201001110005", "Traveling with children", ""],
    [6, 5, 13, 2, 280, "per_person", "pending", "unpaid", "+201001110006", "No seafood ingredients please", ""],
    [7, 0, 1, 2, 255, "per_person", "confirmed", "paid", "+201001110007", "First-time balloon ride", ""],
    [8, 1, 4, 1, 690, "per_group", "cancelled", "refunded", "+201001110008", "Had to leave early", "Schedule conflict with departure flight"],
    [9, 2, 8, 2, 180, "per_person", "completed", "paid", "+201001110009", "Great guide experience", ""],
    [10, 4, 12, 2, 105, "per_person", "rejected", "refunded", "+971501230001", "Wanted another date", "Activity was cancelled"],
    [11, 5, 14, 2, 270, "per_person", "confirmed", "paid", "+962790000001", "Workshop for a couple", ""],
  ];

  return activityBookingModel.create(
    defs.map(([userIndex, activityIndex, scheduleIndex, guests, unitPrice, pricingType, status, paymentStatus, contactPhone, notes, cancellationReason]) => ({
      user: users[userIndex]._id,
      activity: activities[activityIndex]._id,
      schedule: schedules[scheduleIndex]._id,
      guests,
      unitPrice,
      totalPrice: pricingType === "per_group" ? unitPrice : unitPrice * guests,
      pricingType,
      bookingDate: schedules[scheduleIndex].date,
      startTime: schedules[scheduleIndex].startTime,
      endTime: schedules[scheduleIndex].endTime,
      status,
      paymentStatus,
      contactPhone,
      notes,
      cancellationReason,
    }))
  );
}

async function main() {
  if (!dbUrl) {
    throw new Error("DB_URL is missing in src/config/.env.dev");
  }

  await mongoose.connect(dbUrl);
  console.log(`Connected to ${dbUrl}`);

  await resetCollections();

  const hotel = await seedHotel();
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

  console.log("Large local seed completed successfully.");
  console.log(JSON.stringify({
    hotel: hotel.name,
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
    dashboardLogin: { email: "admin.local@palmhotel.com", password: "Admin123!" },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
