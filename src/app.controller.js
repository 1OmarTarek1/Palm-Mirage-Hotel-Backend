import connectDB, { getDatabaseStatus, isDatabaseReady } from "./DB/conenction.js";
import authController from "./modules/auth/auth.controller.js";
import userController from "./modules/user/user.controller.js";
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
  app.get("/health", (req, res) =>
    res.status(isDatabaseReady() ? 200 : 503).json({
      status: isDatabaseReady() ? "ok" : "degraded",
      database: getDatabaseStatus(),
    })
  );

  app.use((req, res, next) => {
    if (isDatabaseReady()) {
      return next();
    }

    return res.status(503).json({
      message: "Service temporarily unavailable while database connection is being restored.",
      database: getDatabaseStatus(),
    });
  });

  app.use("/auth", authController);
  app.use("/user", userController);
  app.use("*", (req, res, next) => {
    return res.status(404).json({ message: "Invalid routing" });
  });

  app.use(globalErrorHandling);

  connectDB().catch(() => {
    console.warn("Initial DB connection did not succeed. The server will keep retrying in the background.");
  });
};
export default bootstrap;
