import connectDB from './DB/conenction.js';
import cors from 'cors';
import authController from './modules/auth/auth.controller.js';
import userController from './modules/user/user.controller.js';
import activityController from './modules/activity/activity.controller.js';
import roomController from './modules/rooms/room.controller.js';
import facilityController from './modules/facility/facility.controller.js';
import paymentController from './modules/payment/payment.controller.js';
import { globalErrorHandling } from './utils/response/error.response.js';
import helmet from 'helmet';
// import rateLimit from "express-rate-limit";
import bookingController from './modules/bookingTable/bookingTable.controller.js';
import tableController from './modules/restaurantTable/restaurantTable.controller.js';
import menuController from './modules/menu/menu.controller.js'
// const limiter = rateLimit({
//   limit: 5,
//   windowMs: 2 * 6 * 1000,
//   message: "Rate limit exceeded",
// });

const bootstrap = (app, express) => {
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
  ];
  const envOrigins = (process.env.ORAGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const whitelist = [...new Set([...defaultOrigins, ...envOrigins])];

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || whitelist.includes(origin)) {
          return callback(null, origin || true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );

  //   app.use("/auth", limiter);
  //   app.use(limiter);

  app.use(express.json());
  app.use(helmet());
  app.get('/', (req, res) => res.send({ message: 'Hello World!' }));
  app.use('/auth', authController);
  app.use('/user', userController);
  app.use('/activity', activityController);
  app.use('/rooms', roomController);
  app.use("/facilities", facilityController);
  app.use('/payment', paymentController);
  app.use('/booking', bookingController);
  app.use('/tables', tableController);
  app.use('/menu',menuController)
  app.use('*', (req, res, next) => {
    return res.status(404).json({ message: 'Invalid routing' });
  });

  app.use(globalErrorHandling);

  connectDB();
};
export default bootstrap;
