import { Router } from "express";
import * as userService from "./service/user.service.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import * as validators from "./user.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
 
const router = Router();
const adminAuth = [authentication(), authorization([roleTypes.admin])];

router.get("/user-data", authentication(), userService.userData);
router.patch("/profile/deleteAccount", authentication(), userService.deleteAccount);

router.get("/", ...adminAuth, userService.getAllUsers);
router.post("/", ...adminAuth, validation(validators.createAdminUser), userService.createAdminUser);
router.patch(
  "/:userId",
  ...adminAuth,
  validation(validators.updateAdminUser),
  userService.updateAdminUser
);
router.delete(
  "/:userId",
  ...adminAuth,
  validation(validators.adminUserIdParam),
  userService.deleteAdminUser
);


export default router;
