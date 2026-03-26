// import Joi from "joi";

// const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
// const roomTypes = ["single", "double", "twin", "deluxe", "family"];

// // Base fields for both create & update
// const baseRoomFields = {
//   roomName: Joi.string().min(3).max(100),
//   roomNumber: Joi.number().min(1),
//   roomType: Joi.string().valid(...roomTypes),
//   price: Joi.number().min(0),
//   discount: Joi.number().min(0).max(75),
//   finalPrice: Joi.number().min(0),
//   capacity: Joi.number().min(1),
//   description: Joi.string().allow(""),
//   facilities: Joi.array().items(Joi.string().hex().length(24)),
//   roomImages: Joi.array().items(
//     Joi.object({
//       secure_url: Joi.string().uri().required(),
//       public_id: Joi.string().required(),
//     }),
//   ),
//   hasOffer: Joi.boolean(),
//   isAvailable: Joi.boolean(),
//   floor: Joi.number().min(0),
//   rating: Joi.number().min(0).max(5),
//   reviewsCount: Joi.number().min(0),
//   viewsCount: Joi.number().min(0),
//   checkInTime: Joi.string()
//     .pattern(timePattern)
//     .messages({
//       "string.pattern.base": "Check-in time must be in HH:mm format",
//     }),
//   checkOutTime: Joi.string()
//     .pattern(timePattern)
//     .messages({
//       "string.pattern.base": "Check-out time must be in HH:mm format",
//     }),
//   cancellationPolicy: Joi.string().allow(""),
// };

// // ---------------- CREATE ----------------
// export const createRoomValidation = Joi.object({
//   ...baseRoomFields,
//   roomName: baseRoomFields.roomName.required(),
//   roomNumber: baseRoomFields.roomNumber.required(),
//   roomType: baseRoomFields.roomType.required(),
//   price: baseRoomFields.price.required(),
//   discount: baseRoomFields.discount.default(0),
//   capacity: baseRoomFields.capacity.default(1),
//   checkInTime: baseRoomFields.checkInTime.default("14:00"),
//   checkOutTime: baseRoomFields.checkOutTime.default("12:00"),
// }).custom((value, helpers) => {
//   const [inHour, inMin] = value.checkInTime.split(":").map(Number);
//   const [outHour, outMin] = value.checkOutTime.split(":").map(Number);

//   if (inHour > outHour || (inHour === outHour && inMin >= outMin)) {
//     return helpers.message("Check-in time must be before check-out time");
//   }
//   return value;
// });

// // ---------------- UPDATE ----------------
// export const updateRoomValidation = Joi.object({
//   ...baseRoomFields,
// })
//   .min(1) // At least one field must be provided
//   .custom((value, helpers) => {
//     if (value.checkInTime && value.checkOutTime) {
//       const [inHour, inMin] = value.checkInTime.split(":").map(Number);
//       const [outHour, outMin] = value.checkOutTime.split(":").map(Number);

//       if (inHour > outHour || (inHour === outHour && inMin >= outMin)) {
//         return helpers.message("Check-in time must be before check-out time");
//       }
//     }
//     return value;
//   });
