import connectDB from './DB/conenction.js';
import cors from 'cors';
import authController from './modules/auth/auth.controller.js';
import userController from './modules/user/user.controller.js';
import activityController from './modules/activity/activity.controller.js';
import activityScheduleController from './modules/activitySchedule/activitySchedule.controller.js';
import activityBookingController from './modules/activityBooking/activityBooking.controller.js';
import roomController from './modules/rooms/room.controller.js';
import facilityController from './modules/facility/facility.controller.js';
import roomAmenityController from './modules/roomAmenity/roomAmenity.controller.js';
import bookingRoomController from './modules/booking/booking.controller.js';
import paymentController from './modules/payment/payment.controller.js';
import { globalErrorHandling } from './utils/response/error.response.js';
import helmet from 'helmet';
import bookingController from './modules/bookingTable/bookingTable.controller.js';
import tableController from './modules/restaurantTable/restaurantTable.controller.js';
import menuController from './modules/menu/menu.controller.js'

const parseCookies = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) return acc;

      const key = part.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      acc[key] = value;
      return acc;
    }, {});

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

  app.use((req, res, next) => {
    req.cookies = parseCookies(req.headers.cookie);
    next();
  });

  app.use(express.json());
  app.use(helmet());
  app.get('/', (req, res) => res.send({ message: 'Hello World!' }));
  app.use('/auth', authController);
  app.use('/user', userController);
  app.use('/activity', activityController);
  app.use('/activity-schedules', activityScheduleController);
  app.use('/activity-bookings', activityBookingController);
  app.use('/rooms', roomController);
  app.use("/facilities", facilityController);
  app.use("/room-amenities", roomAmenityController);
  app.use("/reservations", bookingRoomController);
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
