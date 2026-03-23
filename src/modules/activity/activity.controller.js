import { Router } from "express";
import * as activityService from "./services/activity.service.js";
import * as validators from "./activity.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import { uploadFile } from "../../utils/multer/cloud.multer.js";

const router = Router();

router.post(
  "/",
  authentication(),
  authorization([roleTypes.admin]),
  uploadFile.single("image"),
  validation(validators.createActivity),
  activityService.createActivity
);

router.get("/", validation(validators.queryFilter), activityService.getAllActivities);

router.get("/:id", validation(validators.paramId), activityService.getActivityById);

router.patch(
  "/:id",
  authentication(),
  authorization([roleTypes.admin]),
  uploadFile.single("image"),
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
