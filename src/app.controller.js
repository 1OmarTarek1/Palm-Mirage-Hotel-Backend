import connectDB from "./DB/conenction.js";
import cors from "cors";
import authController from "./modules/auth/auth.controller.js";
import userController from "./modules/user/user.controller.js";
import activityCategoryController from "./modules/activityCategory/activityCategory.controller.js";
import activityController from "./modules/activity/activity.controller.js";
import roomController from "./modules/rooms/room.controller.js";
import { globalErrorHandling } from "./utils/response/error.response.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// const limiter = rateLimit({
//   limit: 5,
//   windowMs: 2 * 6 * 1000,
//   message: "Rate limit exceeded",
// });

const bootstrap = (app, express) => {
  const whitelist = process.env.ORAGIN?.split(",").map((o) => o.trim()) || [];

  // Allow frontend origins (from .env.dev ORAGIN) to call our API and send cookies
  app.use(
    cors({
      origin: whitelist,
      credentials: true,
    })
  );

  //   app.use("/auth", limiter);
  //   app.use(limiter);

  app.use(express.json());
  app.use(helmet());
  app.get("/", (req, res) => res.send({ message: "Hello World!" }));
  app.use("/auth", authController);
  app.use("/user", userController);
  app.use("/activity-category", activityCategoryController);
  app.use("/activity", activityController);
  app.use("/room", roomController);
  app.use("*", (req, res, next) => {
    return res.status(404).json({ message: "Invalid routing" });
  });

  app.use(globalErrorHandling);

  connectDB();
};
export default bootstrap;
