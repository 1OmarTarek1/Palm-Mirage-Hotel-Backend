import { Router } from "express";

import * as bookingService from "./service/booking.service.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import { validation } from "../../middleware/validation.middleware.js";
import * as bookingValidator from "./booking.validation.js";
import { privateNoStore } from "../../middleware/httpCache.middleware.js";

const bookingRouter = Router();

// ---------------- Auth shortcuts ----------------
const userAuth = [authentication(), authorization([roleTypes.user, roleTypes.admin])];
const adminAuth = [authentication(), authorization(roleTypes.admin)];

// ---------------- User Routes ----------------

// Public room availability
bookingRouter.get(
  "/availability/:roomId",
  privateNoStore,
  validation(bookingValidator.getRoomAvailabilitySchema),
  bookingService.getRoomAvailability
);

// Get current user's bookings
bookingRouter.get("/my-bookings", privateNoStore, authentication(), bookingService.getMyBookings);

bookingRouter.get("/active-stay", privateNoStore, ...userAuth, bookingService.getMyActiveStay);

// Create booking
bookingRouter.post(
  "/",
  userAuth,
  validation(bookingValidator.createBookingSchema),
  bookingService.createBooking
);

// Update booking (guests, specialRequests, paymentMethod — pending only)
bookingRouter.patch(
  "/:id",
  authentication(),
  validation(bookingValidator.updateBookingSchema),
  bookingService.updateBooking
);

// Cancel booking
bookingRouter.delete(
  "/:id",
  userAuth,
  validation(bookingValidator.cancelBookingSchema),
  bookingService.cancelBooking
);

// Get booking by ID — placed AFTER named routes to avoid /:id swallowing /my-bookings
bookingRouter.get(
  "/:id",
  privateNoStore,
  ...userAuth,
  validation(bookingValidator.getBookingByIdSchema),
  bookingService.getBookingById
);

// ---------------- Admin Routes ----------------

// Admin: Get all bookings
bookingRouter.get(
  "/",
  privateNoStore,
  ...adminAuth,
  validation(bookingValidator.getAllBookingsSchema),
  bookingService.getAllBookings
);

// ---------------- Export Router ----------------
export default bookingRouter;
