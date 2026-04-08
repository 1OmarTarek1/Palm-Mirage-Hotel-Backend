import joi from "joi";

const objectId = joi.string().hex().length(24);

export const createCheckoutSession = joi.object({
  items: joi.array().items(
    joi.object({
      roomId: objectId.required(),
      checkInDate: joi.date().required(),
      checkOutDate: joi.date().greater(joi.ref("checkInDate")).required(),
      guests: joi.number().integer().min(1).default(1),
    })
  ).optional(),

  restaurantBookings: joi.array().items(
    joi.object({
      bookingMode: joi.string().required(),
      date: joi.string().required(),
      time: joi.string().required(),
      guests: joi.number().integer().min(1).required(),
      number: joi.number().optional().allow(null),
      roomNumber: joi.number().optional().allow(null),
      lineItems: joi.array().items(
        joi.object({
          menuItemId: objectId.required(),
          qty: joi.number().integer().min(1).required(),
          name: joi.string().required(),
          price: joi.number().min(0).required(),
          image: joi.string().allow("").optional()
        })
      ).optional(),
      lineItemsTotal: joi.number().min(0).optional()
    })
  ).optional(),

  activityBookings: joi.array().items(
    joi.object({
      activityId: objectId.required(),
      activityTitle: joi.string().required(),
      scheduleId: objectId.required(),
      scheduleDate: joi.string().required(),
      startTime: joi.string().required(),
      endTime: joi.string().required(),
      guests: joi.number().integer().min(1).required(),
      contactPhone: joi.string().required(),
      pricingType: joi.string().required(),
      price: joi.number().min(0).required(),
      notes: joi.string().allow("").optional(),
      activityImage: joi.string().allow("").optional()
    })
  ).optional(),

  customerEmail: joi.string().email().trim().lowercase().optional(),
  bookingNotes: joi.string().max(500).trim().allow("").optional(),
}).required();

export const getCheckoutSessionStatus = joi.object({
  sessionId: joi.string().trim().required(),
}).required();

export const createActivityCheckoutSession = joi
  .object({
    activityBookingId: objectId.required(),
  })
  .required();

export const createRestaurantCheckoutSession = joi
  .object({
    restaurantBookingId: objectId.required(),
  })
  .required();
