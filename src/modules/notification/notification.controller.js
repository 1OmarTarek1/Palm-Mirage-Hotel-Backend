import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";
import { sensitiveApiNoCache } from "../../middleware/httpCache.middleware.js";
import * as notificationService from "./notification.service.js";

const router = Router();
router.use(sensitiveApiNoCache);

const adminAuth = [authentication(), authorization([roleTypes.admin])];

router.get("/admin/unread-count", ...adminAuth, notificationService.unreadCountAdmin);
router.get("/admin", ...adminAuth, notificationService.listAdmin);
router.patch("/admin/:id/read", ...adminAuth, notificationService.markAdminRead);
router.post("/admin/read-all", ...adminAuth, notificationService.markAllAdminRead);
router.delete("/admin/:id", ...adminAuth, notificationService.deleteAdminNotification);
router.post("/admin/clear-read", ...adminAuth, notificationService.clearReadAdminNotifications);

router.get("/unread-count", authentication(), notificationService.unreadCountMine);
router.get("/", authentication(), notificationService.listMine);
router.patch("/:id/read", authentication(), notificationService.markMineRead);
router.post("/read-all", authentication(), notificationService.markAllMineRead);
router.delete("/:id", authentication(), notificationService.deleteMineNotification);
router.post("/clear-read", authentication(), notificationService.clearReadMineNotifications);

export default router;
