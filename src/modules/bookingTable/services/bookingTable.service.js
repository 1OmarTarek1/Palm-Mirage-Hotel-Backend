import mongoose from 'mongoose';
import BookingModel from '../../../DB/Model/bookingTable.model.js';
import { TableModel } from "../../../DB/Model/table.model.js";
import { asyncHandler } from '../../../utils/response/error.response.js';
import * as dbService from '../../../DB/db.service.js';
import { successResponse } from "../../../utils/response/success.response.js";

// CREATE OR AUTO ASSIGN BOOKING WITH TRANSACTION & WAITLIST
export const createBooking = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { number, date, time, guests } = req.body;
        const startTime = new Date(`${date}T${time}:00`);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        let table;

        if (number) {
            table = await TableModel.findOne({ number }).session(session);

            if (!table) {
                await session.abortTransaction();
                return next(new Error("Table not found"), { cause: 404 });
            }

            if (guests > table.chairs) {
                await session.abortTransaction();
                return next(new Error("Too many guests for this table"), { cause: 400 });
            }
        } else {
            const tables = await TableModel.find({ chairs: { $gte: guests } }).session(session);

            for (let t of tables) {
                const conflict = await BookingModel.findOne({
                    tableNumber: t.number,
                    $or: [
                        { startTime: { $lt: endTime, $gte: startTime } },
                        { endTime: { $gt: startTime, $lte: endTime } },
                        { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
                    ],
                    status: { $ne: 'cancelled' },
                }).session(session);
                if (!conflict) {
                    table = t;
                    break;
                }
            }
        }

        // WAITLIST
        if (!table) {
            const waitlistData = {
                tableNumber: null,
                user: req.user._id,
                startTime,
                endTime,
                guests,
                status: 'pending',
            };
            const waitlistBookings = await BookingModel.create([waitlistData], { session });
            const waitlistBooking = waitlistBookings[0];
            await session.commitTransaction();
            return successResponse({ res, status: 200, message: "All tables are booked. You are added to the waitlist.", data: { booking: waitlistBooking } });
        }

        // PREVENT DUPLICATE
        const duplicate = await BookingModel.findOne({
            tableNumber: table.number,
            user: req.user._id,
            startTime,
            endTime,
            status: { $ne: 'cancelled' },
        }).session(session);

        if (duplicate) {
            await session.abortTransaction();
            return next(new Error("You already booked this table at this time"), { cause: 409 });
        }

        // CREATE CONFIRMED BOOKING
        const bookingData = {
            tableNumber: table.number,
            user: req.user._id,
            startTime,
            endTime,
            guests,
            status: 'confirmed',
        };
        const bookings = await BookingModel.create([bookingData], { session });
        const booking = bookings[0];

        await session.commitTransaction();

        const populatedBooking = await dbService.findOne({
            model: BookingModel,
            filter: { _id: booking._id },
            populate: [{ path: 'user' }],
        });

        return successResponse({ res, status: 201, message: "Booking confirmed", data: { booking: populatedBooking } });

    } catch (error) {
        await session.abortTransaction();
        return next(error);
    } finally {
        session.endSession();
    }
});

// GET AVAILABLE TABLES
export const getAvailableTables = asyncHandler(async (req, res, next) => {
    const { date, time, guests } = req.query;
    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const bookedBookings = await dbService.findAll({
        model: BookingModel,
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
        model: TableModel,
        filter: { number: { $nin: bookedTableNumbers }, chairs: { $gte: guests } },
    });

    return successResponse({ res, status: 200, message: "Available tables", data: { tables: availableTables } });
});

// PROMOTE WAITLIST
export const promoteWaitlist = async (tableNumber, startTime, endTime, session) => {
    const nextInWaitlist = await BookingModel.findOne({ tableNumber: null, startTime, endTime, status: 'pending' })
        .sort({ createdAt: 1 }).session(session);

    if (nextInWaitlist) {
        await BookingModel.findOneAndUpdate(
            { _id: nextInWaitlist._id },
            { tableNumber, status: 'confirmed' },
            { new: true, session }
        );
    }
};

// CANCEL BOOKING
export const cancelBooking = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const tableNumber = parseInt(req.params.number, 10);

        if (!tableNumber) {
            return next(new Error("Invalid table number"), { cause: 400 });
        }

        const booking = await BookingModel.findOne({
            tableNumber,
            status: 'confirmed',
            startTime: { $gte: new Date() },
        }).sort({ startTime: 1 }).session(session);

        if (!booking) {
            await session.abortTransaction();
            return next(new Error("No upcoming booking found for this table"), { cause: 404 });
        }

        // Update status to cancelled
        await BookingModel.findOneAndUpdate(
            { _id: booking._id },
            { status: 'cancelled' },
            { new: true, session }
        );

        // Promote waitlist
        await promoteWaitlist(
            booking.tableNumber,
            booking.startTime,
            booking.endTime,
            session
        );

        await session.commitTransaction();
        return successResponse({ res, status: 200, message: "Booking cancelled successfully", data: { cancelledBooking: booking } });

    } catch (err) {
        await session.abortTransaction();
        return next(err);
    } finally {
        session.endSession();
    }
});