import { Router } from "express";

import {
  listThreads,
  createThread,
  getThreadMessages,
  sendMessage,
  editMessage,
  deleteMessage
} from "../controllers/messageController";

import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.get("/threads", authenticate, listThreads);
router.post("/threads", authenticate, createThread);
router.get("/threads/:id/messages", authenticate, getThreadMessages);
router.post("/threads/:id/messages", authenticate, sendMessage);

router.patch("/messages/:messageId", authenticate, editMessage);
router.delete("/messages/:messageId", authenticate, deleteMessage);

export default router;
