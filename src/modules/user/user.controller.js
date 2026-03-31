import { Router } from "express";
import * as userService from "./service/user.service.js";
import { authentication } from "../../middleware/auth.middleware.js";
// import { endPoint } from "./user.authorization.js";
// import * as validators from "./user.validation.js";
// import { validation } from "../../middleware/validation.middleware.js";
 
const router = Router();

router.get("/user-data", authentication(), userService.userData);
router.patch("/profile/deleteAccount", authentication(), userService.deleteAccount);


//admin

// router.patch(
//   "/admin/ban-user/:userId",
//   authentication(),
//   authorization(endPoint.admin),
//   userService.banUserfromAdmin
// );
// router.patch(
//   "/admin/unban-user/:userId",
//   authentication(),
//   authorization(endPoint.admin),
//   validation(validators.ban),
//   userService.unbanUserfromAdmin
// );


export default router;
