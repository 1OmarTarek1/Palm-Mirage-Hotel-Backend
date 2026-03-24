import joi from "joi";

export const createCheckoutSession = joi.object({
  items: joi.array().items(
    joi.object({
      name: joi.string().required(),
      price: joi.number().positive().required(),
      quantity: joi.number().integer().positive().required(),
    })
  ).required(),
}).required();
