import { Router } from "express";

import {
  listMedications,
  createMedication
} from "../controllers/medicationController";

import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, listMedications);
router.post("/", authenticate, createMedication);

export default router;
