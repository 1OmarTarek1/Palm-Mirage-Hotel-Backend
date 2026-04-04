import { Router } from "express";

import * as roomAmenityService from "./service/roomAmenity.service.js";
import * as roomAmenityValidation from "./roomAmenity.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import {
  authentication,
  authorization,
} from "../../middleware/auth.middleware.js";

const roomAmenityRouter = Router();
const adminAuth = [authentication(), authorization(roleTypes.admin)];

roomAmenityRouter.get("/", roomAmenityService.getAllRoomAmenities);
roomAmenityRouter.get("/:id", roomAmenityService.getRoomAmenityById);
roomAmenityRouter.post(
  "/",
  adminAuth,
  validation(roomAmenityValidation.createRoomAmenityValidation),
  roomAmenityService.createRoomAmenity
);
roomAmenityRouter.patch(
  "/:id",
  adminAuth,
  validation(roomAmenityValidation.updateRoomAmenityValidation),
  roomAmenityService.updateRoomAmenityById
);
roomAmenityRouter.delete("/:id", adminAuth, roomAmenityService.deleteRoomAmenityById);

export default roomAmenityRouter;
