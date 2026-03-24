import Stripe from "stripe";

export const createCheckoutSession = async (req, res, next) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { items } = req.body; // Expecting [{ name, price, quantity }]

  try {
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

    return res.status(200).json({ status: "success", url: session.url });
  } catch (error) {
    return next(error);
  }
};
