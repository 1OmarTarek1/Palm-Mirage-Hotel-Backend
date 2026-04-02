import { Router } from "express";
import * as paymentService from "./services/payment.service.js";
import { validation } from "../../middleware/validation.middleware.js";
import * as paymentValidation from "./payment.validation.js";

const router = Router();

router.post(
  "/create-checkout-session",
  validation(paymentValidation.createCheckoutSession),
  paymentService.createCheckoutSession
);

router.get("/success", (req, res) => {
  res.status(200).json({ message: "Payment successful!" });
});

router.get("/cancel", (req, res) => {
  res.status(200).json({ message: "Payment canceled." });
});

export default router;
