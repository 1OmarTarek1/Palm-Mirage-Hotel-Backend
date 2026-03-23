import Joi from "joi";

const timePattern = /^\d{2}:\d{2}$/;

// Create Room Validation
export const createRoomValidation = Joi.object({
  roomName: Joi.string().min(3).max(100).required(),
  roomType: Joi.string()
    .valid("single", "double", "twin", "deluxe", "family")
    .required(),
  price: Joi.number().min(0).required(),
  discount: Joi.number()
    .min(0)
    .default(0)
    .max(Joi.ref("price"))
    .messages({ "number.max": "Discount cannot exceed the room price" }),
  capacity: Joi.number().min(1).default(1),
  facilities: Joi.array().items(Joi.string().hex().length(24)).optional(),
  description: Joi.string().allow("").optional(),
  floor: Joi.number().min(0).optional(),
  roomImages: Joi.array().items(Joi.string().uri()).optional(),
  hasOffer: Joi.boolean().optional(),
  cancellationPolicy: Joi.string().allow("").optional(),
  checkInTime: Joi.string()
    .pattern(timePattern)
    .default("14:00")
    .messages({
      "string.pattern.base": "Check-in time must be in HH:mm format",
    }),
  checkOutTime: Joi.string()
    .pattern(timePattern)
    .default("12:00")
    .messages({
      "string.pattern.base": "Check-out time must be in HH:mm format",
    }),
}).custom((value, helpers) => {
  // checkInTime < checkOutTime (basic check)
  const [inHour, inMin] = value.checkInTime.split(":").map(Number);
  const [outHour, outMin] = value.checkOutTime.split(":").map(Number);

  if (inHour > outHour || (inHour === outHour && inMin >= outMin)) {
    return helpers.error(
      "any.custom",
      "Check-in time must be before check-out time",
    );
  }
  return value;
});

// Update Room Validation (partial updates allowed)
export const updateRoomValidation = Joi.object({
  roomName: Joi.string().min(3).max(100).optional(),
  roomType: Joi.string()
    .valid("single", "double", "twin", "deluxe", "family")
    .optional(),
  price: Joi.number().min(0).optional(),
  discount: Joi.number().min(0).optional(),
  capacity: Joi.number().min(1).optional(),
  facilities: Joi.array().items(Joi.string().hex().length(24)).optional(),
  description: Joi.string().allow("").optional(),
  floor: Joi.number().min(0).optional(),
  roomImages: Joi.array().items(Joi.string().uri()).optional(),
  hasOffer: Joi.boolean().optional(),
  cancellationPolicy: Joi.string().allow("").optional(),
  checkInTime: Joi.string().pattern(timePattern).optional(),
  checkOutTime: Joi.string().pattern(timePattern).optional(),
}).custom((value, helpers) => {
  if (value.checkInTime && value.checkOutTime) {
    const [inHour, inMin] = value.checkInTime.split(":").map(Number);
    const [outHour, outMin] = value.checkOutTime.split(":").map(Number);
    if (inHour > outHour || (inHour === outHour && inMin >= outMin)) {
      return helpers.error(
        "any.custom",
        "Check-in time must be before check-out time",
      );
    }
  }
  return value;
});
