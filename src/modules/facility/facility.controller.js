import { Router } from "express";
import * as facilityService from "./service/facility.service.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import { publicShortCache } from "../../middleware/httpCache.middleware.js";

const facilityRouter = Router();
const catalogCache = publicShortCache(120, 300);

const adminAuth = [authentication(), authorization([roleTypes.admin])];

// Public
facilityRouter.get("/", catalogCache, facilityService.getAllFacilities);
facilityRouter.get("/:id", catalogCache, facilityService.getFacilityById);

// Admin
facilityRouter.post("/",
     ...adminAuth, 
     facilityService.createFacility);
facilityRouter.patch("/:id",
      ...adminAuth,
      facilityService.updateFacilityById);
facilityRouter.delete("/:id",
      ...adminAuth,
      facilityService.deleteFacilityById);

export default facilityRouter;
