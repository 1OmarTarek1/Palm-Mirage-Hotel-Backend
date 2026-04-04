import { Router } from "express";
import { createBooking, getAvailableTables, cancelBooking } from "./services/bookingTable.service.js";
import { getAllBookings, updateBookingStatus } from "./services/bookingTable.service.js";
import { validation } from "../../middleware/validation.middleware.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import * as validators from "./bookingTable.validation.js";

const router = Router();

router.post("/booking", authentication(), validation(validators.createBooking), createBooking);

router.get("/", authentication(), authorization([roleTypes.admin]), getAllBookings);
router.get("/available-tables", validation(validators.getAvailableTables), getAvailableTables);
router.patch(
  "/:id/status",
  authentication(),
  authorization([roleTypes.admin]),
  validation(validators.updateBookingStatus),
  updateBookingStatus
);
router.delete("/cancel/:number", authentication(), validation(validators.cancelBooking), cancelBooking);
export default router;
