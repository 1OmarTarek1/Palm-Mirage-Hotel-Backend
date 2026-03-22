import connectDB from "./DB/conenction.js";
import authController from "./modules/auth/auth.controller.js";
import userController from "./modules/user/user.controller.js";
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
  var whitelist = [process.env.ORAGIN.split(",") || []];

  //   app.use("/auth", limiter);
  //   app.use(limiter);

  app.use(express.json());
  app.use(helmet());
  app.get("/", (req, res) => res.send({ message: "Hello World!" }));
  app.use("/auth", authController);
  app.use("/user", userController);
  app.use("/room", roomController);
  app.use("*", (req, res, next) => {
    return res.status(404).json({ message: "Invalid routing" });
  });

  app.use(globalErrorHandling);

  connectDB();
};
export default bootstrap;
