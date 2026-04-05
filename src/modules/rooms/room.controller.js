import { Router } from "express";

import * as roomService from "./service/room.service.js";
import * as roomValidator from "./room.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import {
  authentication,
  authorization,
} from "../../middleware/auth.middleware.js";
import { uploadCloudFile } from "../../utils/multer/cloud.multer.js";
import { fileValidationTypes } from "../../utils/multer/local.multer.js";
import { publicShortCache } from "../../middleware/httpCache.middleware.js";

const roomRouter = Router();
const catalogCache = publicShortCache(60, 180);

const adminAuth = [authentication(), authorization(roleTypes.admin)];

roomRouter.get("/", catalogCache, roomService.getAllRooms);
roomRouter.get("/offers", catalogCache, roomService.getRoomsWithOffers);
roomRouter.get("/top-rated", catalogCache, roomService.getTopRatedRooms);
roomRouter.get("/:id", catalogCache, roomService.getRoomById);

//  Admin Routes
roomRouter.post(
  "/create-room",
  adminAuth,
  uploadCloudFile(fileValidationTypes.image).array("roomImages", 5),
  // validation(roomValidator.createRoomValidation),
  roomService.createRoom,
);
roomRouter.patch(
  "/:id",
  // adminAuth,
  uploadCloudFile(fileValidationTypes.image).array("roomImages", 5),
  // validation(roomValidator.updateRoomValidation),
  roomService.updateRoomById,
);
roomRouter.delete("/:id", adminAuth, roomService.deleteRoomById);

export default roomRouter;
