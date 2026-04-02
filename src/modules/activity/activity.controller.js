import { Router } from "express";
import * as activityService from "./services/activity.service.js";
import * as validators from "./activity.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import { uploadCloudFile } from "../../utils/multer/cloud.multer.js";
import { fileValidationTypes } from "../../utils/multer/local.multer.js";
import * as activityScheduleValidators from "../activitySchedule/activitySchedule.validation.js";
import * as activityScheduleService from "../activitySchedule/services/activitySchedule.service.js";

const router = Router();

router.post(
  "/",
  authentication(),
  authorization([roleTypes.admin]),
  uploadCloudFile(fileValidationTypes.image).array("image",5),
  validation(validators.createActivity),
  activityService.createActivity
);

router.get("/", validation(validators.queryFilter), activityService.getAllActivities);

router.get(
  "/:activityId/schedules",
  validation(activityScheduleValidators.activitySchedulesParam),
  activityScheduleService.getSchedulesByActivity
);

router.post(
  "/:activityId/schedules",
  authentication(),
  authorization([roleTypes.admin]),
  validation(activityScheduleValidators.createSchedule),
  activityScheduleService.createSchedule
);

router.get("/:id", validation(validators.paramId), activityService.getActivityById);

router.patch(
  "/:id",
  authentication(),
  authorization([roleTypes.admin]),
  uploadCloudFile(fileValidationTypes.image).single("image"),
  validation(validators.updateActivity),
  activityService.updateActivity
);

router.delete(
  "/:id",
  authentication(),
  authorization([roleTypes.admin]),
  validation(validators.paramId),
  activityService.deleteActivity
);

export default router;
