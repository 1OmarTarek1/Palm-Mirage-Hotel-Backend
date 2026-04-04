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
  ).required(),
  customerEmail: joi.string().email().trim().lowercase().optional(),
  bookingNotes: joi.string().max(500).trim().allow("").optional(),
}).required();

export const getCheckoutSessionStatus = joi.object({
  sessionId: joi.string().trim().required(),
}).required();
