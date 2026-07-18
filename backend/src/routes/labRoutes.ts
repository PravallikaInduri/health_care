import { Router } from "express";

import {
  getLabMe,
  getLabOrders,
  updateLabOrderStatus,
  downloadLabResult,
  uploadLabResult,
  markLabOrderPaid,
  listLabTests,
  createLabTest,
  updateLabTest,
  deleteLabTest,
} from "../controllers/labController";

import { authenticate, authorize } from "../middleware/authMiddleware";
import { upload } from "../middleware/uploadMiddleware";

const router = Router();

/* All lab routes require authenticated lab staff. */
router.use(authenticate, authorize("LAB_TECH", "LAB_ADMIN"));

router.get("/me", getLabMe);
router.get("/orders", getLabOrders);
router.patch("/orders/:id/status", updateLabOrderStatus);
router.post("/orders/:id/paid", markLabOrderPaid);
router.post("/orders/:id/results", upload.single("file"), uploadLabResult);
router.get("/results/:id/file", downloadLabResult);

/* Lab test catalogue */
router.get("/tests", listLabTests);
router.post("/tests", createLabTest);
router.patch("/tests/:id", updateLabTest);
router.delete("/tests/:id", deleteLabTest);

export default router;
