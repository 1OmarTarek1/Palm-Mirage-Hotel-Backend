/**
 * Wipes and re-seeds menu items, categories, and RestaurantPage only.
 * Tables and table bookings are not modified. Run from Backend folder:
 *   node scripts/seed-menu-only.js
 */
process.argv.push("--menu-only");
await import("./seed-local-data.js");
