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
import * as paymentService from './modules/payment/services/payment.service.js';
import { globalErrorHandling } from './utils/response/error.response.js';
import helmet from 'helmet';
import bookingController from './modules/bookingTable/bookingTable.controller.js';
import tableController from './modules/restaurantTable/restaurantTable.controller.js';
import menuController from './modules/menu/menu.controller.js'
import notificationController from './modules/notification/notification.controller.js';
import { allowOrigin } from './config/origins.js';

import cookieParser from 'cookie-parser';

const bootstrap = (app, express) => {
  app.use(cookieParser());
  app.use(
    cors({
      origin: allowOrigin,
      credentials: true,
    })
  );

  app.post(
    "/payment/webhook",
    express.raw({ type: "application/json" }),
    paymentService.handleStripeWebhook
  );

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
  app.use('/notifications', notificationController);
  app.use('*', (req, res, next) => {
    return res.status(404).json({ message: 'Invalid routing' });
  });

  app.use(globalErrorHandling);

  connectDB().catch((err) => {
    console.error(`DB connection failed: ${err.message}`);
    process.exit(1);
  });
};
export default bootstrap;
