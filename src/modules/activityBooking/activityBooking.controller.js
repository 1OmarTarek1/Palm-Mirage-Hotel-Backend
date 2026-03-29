import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import * as validators from "./activityBooking.validation.js";
import * as activityBookingService from "./services/activityBooking.service.js";

const router = Router();

router.post(
  "/",
  authentication(),
  validation(validators.createBooking),
  activityBookingService.createBooking
);

router.get(
  "/my",
  authentication(),
  activityBookingService.getMyBookings
);

router.get(
  "/",
  validation(validators.queryFilter),
  activityBookingService.getAllBookings
);

router.get(
  "/:id",
  validation(validators.bookingIdParam),
  activityBookingService.getBookingById
);

router.patch(
  "/:id/status",
  authentication(),
  authorization([roleTypes.admin]),
  validation(validators.updateBookingStatus),
  activityBookingService.updateBookingStatus
);

router.patch(
  "/:id/cancel",
  authentication(),
  validation(validators.cancelBooking),
  activityBookingService.cancelMyBooking
);

export default router;
