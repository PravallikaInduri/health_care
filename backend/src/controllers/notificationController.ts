import { Response } from "express";
import {
  listNotificationsService,
  markNotificationReadService,
  markAllReadService,
} from "../services/notificationService";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage, pickId } from "../utils/controllerHelpers";

export const listNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listNotificationsService(req.user.id, {
      unreadOnly: req.query.unread === "1",
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return res.status(200).json({ success: true, ...data });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await markNotificationReadService(
      req.user.id,
      pickId(req.params.id)
    );
    return res.status(200).json({ ...result });
  } catch (e) {
    const status = /not found/i.test(errorMessage(e)) ? 404 : 500;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const markAllRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await markAllReadService(req.user.id);
    return res.status(200).json({ ...result });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};
