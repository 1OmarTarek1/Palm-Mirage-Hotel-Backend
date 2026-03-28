import mongoose from 'mongoose';
import Booking from '../../../DB/Model/bookingTable.model.js';
import { asyncHandler } from '../../../utils/response/error.response.js';
import * as dbService from '../../../DB/db.service.js';

// CREATE OR AUTO ASSIGN BOOKING WITH TRANSACTION & WAITLIST
export const createBooking = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { number, date, time, guests } = req.body; // number = table number
    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    let table;

    if (number) {
      table = await dbService.findOne({
        model: Table,
        filter: { number }, // search by table number
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
      });
      for (let t of tables) {
        const conflict = await dbService.findOne({
          model: Booking,
          filter: {
            tableNumber: t.number,
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

    // WAITLIST
    if (!table) {
      const waitlistBooking = await dbService.create({
        model: Booking,
        data: {
          tableNumber: null,
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

    // PREVENT DUPLICATE
    const duplicate = await dbService.findOne({
      model: Booking,
      filter: {
        tableNumber: table.number,
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

    // CREATE CONFIRMED BOOKING
    const booking = await dbService.create({
      model: Booking,
      data: {
        tableNumber: table.number,
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
      filter: { tableNumber: table.number, user: req.user._id, startTime },
      populate: ['user'],
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

// GET AVAILABLE TABLES
export const getAvailableTables = asyncHandler(async (req, res) => {
  const { date, time, guests } = req.query;
  const startTime = new Date(`${date}T${time}:00`);
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

  const bookedBookings = await dbService.findAll({
    model: Booking,
    filter: {
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
      ],
      status: { $ne: 'cancelled' },
    },
    select: 'tableNumber',
  });

  const bookedTableNumbers = bookedBookings
    .map((b) => b.tableNumber)
    .filter(Boolean);

  const availableTables = await dbService.findAll({
    model: Table,
    filter: { number: { $nin: bookedTableNumbers }, chairs: { $gte: guests } },
  });

  return res.json({ message: 'Available tables', tables: availableTables });
});

// PROMOTE WAITLIST BOOKINGS
export const promoteWaitlist = async (
  tableNumber,
  startTime,
  endTime,
  session
) => {
  const nextInWaitlist = await dbService.findOne({
    model: Booking,
    filter: { tableNumber: null, startTime, endTime, status: 'pending' },
    options: { sort: { createdAt: 1 } },
  });

  if (nextInWaitlist) {
    await dbService.findOneAndUpdate({
      model: Booking,
      filter: { tableNumber: null, user: nextInWaitlist.user, startTime },
      data: { tableNumber, status: 'confirmed' },
    });
  }
};

export const cancelBooking = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('req.params.number:', req.params.number);

    const tableNumber = parseInt(req.params.number, 10);
    console.log('Parsed tableNumber:', tableNumber);

    if (!tableNumber) {
      return res.status(400).json({ message: 'Invalid table number' });
    }

    // نجيب أقرب حجز مؤكد للترابيزة
    const booking = await dbService.findOne({
      model: Booking,
      filter: {
        tableNumber,
        status: 'confirmed',
        startTime: { $gte: new Date() },
      },
      options: { sort: { startTime: 1 } }, // أقرب حجز
    });

    if (!booking) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ message: 'No upcoming booking found for this table' });
    }

    // لو الحجز موجود مسبقاً ملغى
    if (booking.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    // إلغاء الحجز
    await dbService.findOneAndUpdate({
      model: Booking,
      filter: { tableNumber, startTime: booking.startTime },
      data: { status: 'cancelled' },
    });

    // ترقية أي waitlist للحجز الملغي
    await promoteWaitlist(
      booking.tableNumber,
      booking.startTime,
      booking.endTime,
      session
    );

    await session.commitTransaction();
    return res.json({
      message: 'Booking cancelled successfully',
      cancelledBooking: booking,
    });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});
