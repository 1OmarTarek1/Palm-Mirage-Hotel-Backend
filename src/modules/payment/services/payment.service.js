import Stripe from "stripe";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";

export const createCheckoutSession = asyncHandler(async (req, res, next) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { items } = req.body; // Expecting [{ name, price, quantity }]

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100, // Stripe expects amount in cents
      },
      quantity: item.quantity,
    })),
    mode: "payment",
    success_url: `${req.protocol}://${req.get("host")}/payment/success`,
    cancel_url: `${req.protocol}://${req.get("host")}/payment/cancel`,
  });

  return successResponse({ res, message: "Checkout session created", data: { url: session.url } });
});
