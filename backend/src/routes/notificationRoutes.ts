import { Router } from "express";
import {
  listNotifications,
  markNotificationRead,
  markAllRead,
} from "../controllers/notificationController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

/* All notification routes require authentication; they're per-user. */
router.use(authenticate);

router.get("/", listNotifications);
router.patch("/:id/read", markNotificationRead);
router.post("/read-all", markAllRead);

export default router;
