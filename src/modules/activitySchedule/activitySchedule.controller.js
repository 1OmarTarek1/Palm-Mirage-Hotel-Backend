import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import * as validators from "./activitySchedule.validation.js";
import * as activityScheduleService from "./services/activitySchedule.service.js";
import { publicShortCache } from "../../middleware/httpCache.middleware.js";

const router = Router();
const catalogCache = publicShortCache(60, 180);

router.get("/", catalogCache, validation(validators.queryFilter), activityScheduleService.getAllSchedules);

router.get(
  "/:id",
  catalogCache,
  validation(validators.scheduleIdParam),
  activityScheduleService.getScheduleById
);

router.patch(
  "/:id",
  authentication(),
  authorization([roleTypes.admin]),
  validation(validators.updateSchedule),
  activityScheduleService.updateSchedule
);

router.delete(
  "/:id",
  authentication(),
  authorization([roleTypes.admin]),
  validation(validators.scheduleIdParam),
  activityScheduleService.deleteSchedule
);

export default router;
