import joi from "joi";
import { Types } from "mongoose";
import { genderTypes } from "../DB/Model/User.model.js";

export const fileobject = {
  fieldname: joi.string(),
  originalname: joi.string(),
  encoding: joi.string(),
  mimetype: joi.string(),
  destination: joi.string(),
  filename: joi.string(),
  path: joi.string(),
  size: joi.number(),
};

const checkObjectId = (value, helper) => {
  return Types.ObjectId.isValid(value) ? true : helper.message("Invalid ObjectId");
};
 
export const generalFields = {
  username: joi.string().min(2).max(30).trim(),
  country: joi.string().min(2).max(15).trim(),
  email: joi.string().email({ tlds: { allow: ["com", "net"] }, minDomainSegments: 2, maxDomainSegments: 3 }),
  password: joi.string().pattern(new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)),
  confirmationPassword: joi.string(),
  code: joi.string().pattern(new RegExp(/^\d{4}$/)),
  phone: joi.string().pattern(new RegExp(/^(002|\+2)?01[0125][0-9]{8}$/)),
  DOB: joi.date().less("now"),
  gender: joi.string().valid(...Object.values(genderTypes)),
  id: joi.string().custom(checkObjectId),
  fileobject,
  file: joi.object(fileobject),
  
};




export const validation = (schema) => {
  return (req, res, next) => {
    const inputDate = { ...req.body, ...req.params, ...req.query };
    if (req.file || req.files?.length) {
      inputDate.file = req.file || req.files;
    }

    const validationResult = schema.validate(inputDate, { abortEarly: false });
    if (validationResult.error) {
      return res.status(400).json({ message: "validation error", details: validationResult.error.details });
    }
    return next();
  };
};
