import { Router } from "express";
import * as paymentService from "./services/payment.service.js";
import { validation } from "../../middleware/validation.middleware.js";
import * as paymentValidation from "./payment.validation.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";

const router = Router();
const userAuth = [authentication(), authorization([roleTypes.user])];

router.post(
  "/create-checkout-session",
  ...userAuth,
  validation(paymentValidation.createCheckoutSession),
  paymentService.createCheckoutSession
);

router.get(
  "/checkout-session/:sessionId",
  ...userAuth,
  validation(paymentValidation.getCheckoutSessionStatus),
  paymentService.getCheckoutSessionStatus
);

router.get("/success", (req, res) => {
  res.status(200).json({ message: "Payment successful!" });
});

router.get("/cancel", (req, res) => {
  res.status(200).json({ message: "Payment canceled." });
});

export default router;
