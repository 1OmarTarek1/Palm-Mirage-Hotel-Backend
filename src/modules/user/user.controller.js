import { Router } from "express";
import * as userService from "./service/user.service.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import * as validators from "./user.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import { uploadCloudFile } from "../../utils/multer/cloud.multer.js";
import { fileValidationTypes } from "../../utils/multer/local.multer.js";
 
const router = Router();
const adminAuth = [authentication(), authorization([roleTypes.admin])];

router.get("/user-data", authentication(), userService.userData);
router.patch(
  "/profile",
  authentication(),
  uploadCloudFile(fileValidationTypes.image).single("image"),
  validation(validators.updateProfile),
  userService.updateProfile
);
router.get("/preferences", authentication(), userService.getPreferences);
router.patch(
  "/preferences",
  authentication(),
  validation(validators.updatePreferences),
  userService.updatePreferences
);
router.patch("/profile/deleteAccount", authentication(), userService.deleteAccount);

router.get("/", ...adminAuth, userService.getAllUsers);
router.post(
  "/",
  ...adminAuth,
  uploadCloudFile(fileValidationTypes.image).single("image"),
  validation(validators.createAdminUser),
  userService.createAdminUser
);
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
