import { Router } from "express";
import * as paymentService from "./services/payment.service.js";
import { validation } from "../../middleware/validation.middleware.js";
import * as paymentValidation from "./payment.validation.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import { privateNoStore } from "../../middleware/httpCache.middleware.js";

const router = Router();
const userAuth = [authentication(), authorization([roleTypes.user])];

router.post(
  "/create-checkout-session",
  ...userAuth,
  validation(paymentValidation.createCheckoutSession),
  paymentService.createCheckoutSession
);

router.post(
  "/create-activity-checkout-session",
  ...userAuth,
  validation(paymentValidation.createActivityCheckoutSession),
  paymentService.createActivityCheckoutSession
);

router.post(
  "/create-restaurant-checkout-session",
  ...userAuth,
  validation(paymentValidation.createRestaurantCheckoutSession),
  paymentService.createRestaurantCheckoutSession
);

router.get(
  "/checkout-session/:sessionId",
  privateNoStore,
  ...userAuth,
  validation(paymentValidation.getCheckoutSessionStatus),
  paymentService.getCheckoutSessionStatus
);

router.get("/success", privateNoStore, (req, res) => {
  res.status(200).json({ message: "Payment successful!" });
});

router.get("/cancel", privateNoStore, (req, res) => {
  res.status(200).json({ message: "Payment canceled." });
});

export default router;
