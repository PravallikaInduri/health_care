import { Router } from "express";

import {
  uploadDocument,
  listDocuments,
  downloadDocument,
  deleteDocument
} from "../controllers/documentController";

import { authenticate } from "../middleware/authMiddleware";
import { upload } from "../middleware/uploadMiddleware";

const router = Router();

router.post("/", authenticate, upload.single("file"), uploadDocument);
router.get("/", authenticate, listDocuments);
router.get("/:id/download", authenticate, downloadDocument);
router.delete("/:id", authenticate, deleteDocument);

export default router;
