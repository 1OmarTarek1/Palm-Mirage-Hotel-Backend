import { Router } from "express";
// import * as profileService from "./service/profile.service.js";
//   import { authentication, authorization } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/profile");
// router.patch("/profile/update-password");

// router.patch("/profile/deleteAccount", authentication(), profileService.deleteAccount);

//admin

export default router;
