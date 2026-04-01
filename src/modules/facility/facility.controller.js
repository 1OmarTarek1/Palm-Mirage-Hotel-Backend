import { Router } from "express";
import * as facilityService from "./service/facility.service.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";

const facilityRouter = Router();

const adminAuth = [authentication(), authorization([roleTypes.admin])];

// Public
facilityRouter.get("/", facilityService.getAllFacilities);
facilityRouter.get("/:id", facilityService.getFacilityById);

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
