import mongoose from 'mongoose';
import Booking from '../../../DB/Model/booking.model.js';
import Table from '../../../DB/Model/table.model.js';
import { asyncHandler } from '../../../utils/response/error.response.js';
import * as dbService from '../../DB/db.service.js';

// CREATE OR AUTO ASSIGN BOOKING WITH TRANSACTION & WAITLIST 
export const createBooking = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tableId, date, time, guests } = req.body;
    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    // Auto-assign table if tableId not provided
    let table;
    if (tableId) {
      table = await dbService.findOne({
        model: Table,
        filter: { _id: tableId },
      });
      if (!table) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Table not found' });
      }
      if (guests > table.chairs) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: 'Too many guests for this table' });
      }
    } else {
      const tables = await dbService.findAll({
        model: Table,
        filter: { chairs: { $gte: guests } },
        skip: 0,
        limit: 1000,
      });
      for (let t of tables) {
        const conflict = await dbService.findOne({
          model: Booking,
          filter: {
            table: t._id,
            $or: [
              { startTime: { $lt: endTime, $gte: startTime } },
              { endTime: { $gt: startTime, $lte: endTime } },
              { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
            ],
            status: { $ne: 'cancelled' },
          },
        });

        if (!conflict) {
          table = t;
          break;
        }
      }
    }

    // 2️⃣ Waitlist
    if (!table) {
      const waitlistBooking = await dbService.create({
        model: Booking,
        data: {
          table: null,
          user: req.user._id,
          startTime,
          endTime,
          guests,
          status: 'pending',
        },
      });

      await session.commitTransaction();
      return res.status(200).json({
        message: 'All tables are booked. You are added to the waitlist.',
        booking: waitlistBooking,
      });
    }

    // 3️⃣ Prevent duplicate booking
    const duplicate = await dbService.findOne({
      model: Booking,
      filter: {
        table: table._id,
        user: req.user._id,
        startTime,
        endTime,
        status: { $ne: 'cancelled' },
      },
    });

    if (duplicate) {
      await session.abortTransaction();
      return res
        .status(409)
        .json({ message: 'You already booked this table at this time' });
    }

    // 4️⃣ Create confirmed booking
    const booking = await dbService.create({
      model: Booking,
      data: {
        table: table._id,
        user: req.user._id,
        startTime,
        endTime,
        guests,
        status: 'confirmed',
      },
    });

    await session.commitTransaction();

    const populatedBooking = await dbService.findOne({
      model: Booking,
      filter: { _id: booking._id },
      populate: ['table', 'user'],
    });

    return res
      .status(201)
      .json({ message: 'Booking confirmed', booking: populatedBooking });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});
