import mongoose from 'mongoose';
import BookingModel from '../../../DB/Model/bookingTable.model.js';
import { TableModel } from "../../../DB/Model/table.model.js";
import { asyncHandler } from '../../../utils/response/error.response.js';
import * as dbService from '../../../DB/db.service.js';
import { successResponse } from "../../../utils/response/success.response.js";

// CREATE OR AUTO ASSIGN BOOKING WITH WAITLIST
export const createBooking = asyncHandler(async (req, res, next) => {
    const { number, date, time, guests } = req.body;
    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    let table;

    if (number) {
        table = await dbService.findOne({ model: TableModel, filter: { number } });

        if (!table) {
            return next(new Error("Table not found"), { cause: 404 });
        }

        if (guests > table.chairs) {
            return next(new Error("Too many guests for this table"), { cause: 400 });
        }
    } else {
        const tables = await dbService.findAll({ model: TableModel, filter: { chairs: { $gte: guests } } });

        for (let t of tables) {
            const conflict = await dbService.findOne({
                model: BookingModel,
                filter: {
                    tableNumber: t.number,
                    $or: [
                        { startTime: { $lt: endTime, $gte: startTime } },
                        { endTime: { $gt: startTime, $lte: endTime } },
                        { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
                    ],
                    status: { $ne: 'cancelled' },
                }
            });
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
        const waitlistBooking = await dbService.create({ model: BookingModel, data: waitlistData });
        return successResponse({ res, status: 200, message: "All tables are booked. You are added to the waitlist.", data: { booking: waitlistBooking } });
    }

    // PREVENT DUPLICATE
    const duplicate = await dbService.findOne({
        model: BookingModel,
        filter: {
            tableNumber: table.number,
            user: req.user._id,
            startTime,
            endTime,
            status: { $ne: 'cancelled' },
        }
    });

    if (duplicate) {
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
    const booking = await dbService.create({ model: BookingModel, data: bookingData });

    const populatedBooking = await dbService.findOne({
        model: BookingModel,
        filter: { _id: booking._id },
        populate: [{ path: 'user' }],
    });

    return successResponse({ res, status: 201, message: "Booking confirmed", data: { booking: populatedBooking } });
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
export const promoteWaitlist = async (tableNumber, startTime, endTime) => {
    const nextInWaitlist = await BookingModel.findOne({ tableNumber: null, startTime, endTime, status: 'pending' })
        .sort({ createdAt: 1 });

    if (nextInWaitlist) {
        await dbService.findOneAndUpdate({
            model: BookingModel,
            filter: { _id: nextInWaitlist._id },
            data: { tableNumber, status: 'confirmed' },
            options: { new: true }
        });
    }
};

// CANCEL BOOKING
export const cancelBooking = asyncHandler(async (req, res, next) => {
    const tableNumber = parseInt(req.params.number, 10);

    if (!tableNumber) {
        return next(new Error("Invalid table number"), { cause: 400 });
    }

    const booking = await BookingModel.findOne({
        tableNumber,
        status: 'confirmed',
        startTime: { $gte: new Date() },
    }).sort({ startTime: 1 });

    if (!booking) {
        return next(new Error("No upcoming booking found for this table"), { cause: 404 });
    }

    // Update status to cancelled
    await dbService.findOneAndUpdate({
        model: BookingModel,
        filter: { _id: booking._id },
        data: { status: 'cancelled' },
        options: { new: true }
    });

    // Promote waitlist
    await promoteWaitlist(
        booking.tableNumber,
        booking.startTime,
        booking.endTime
    );

    return successResponse({ res, status: 200, message: "Booking cancelled successfully", data: { cancelledBooking: booking } });
});