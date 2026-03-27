import { Router } from "express";

import * as roomService from "./service/room.service.js";
import * as roomValidator from "./room.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import {
  authentication,
  authorization,
} from "../../middleware/auth.middleware.js";
import { uploadFile } from "../../utils/multer/cloud.multer.js";

const roomRouter = Router();

const adminAuth = [authentication, authorization(roleTypes.admin)];

roomRouter.get("/", roomService.getAllRooms);
roomRouter.get("/offers", roomService.getRoomsWithOffers);
roomRouter.get("/top-rated", roomService.getTopRatedRooms);
roomRouter.get("/:id", roomService.getRoomById);

//  Admin Routes
roomRouter.post(
  "/",
  // adminAuth,
  uploadFile.array("roomImages", 5),
  // validation(roomValidator.createRoomValidation),
  roomService.createRoom,
);
roomRouter.patch(
  "/:id",
  adminAuth,
  validation(roomValidator.updateRoomValidation),
  roomService.updateRoomById,
);
roomRouter.delete("/:id", adminAuth, roomService.deleteRoomById);

export default roomRouter;