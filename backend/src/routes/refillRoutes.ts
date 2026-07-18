import { Router } from "express";

import {
  listMyPrescriptions,
  createRefillRequest,
  listMyRefills,
  listProviderRefills,
  decideRefill
} from "../controllers/refillController";

import { authenticate } from "../middleware/authMiddleware";

const router = Router();

/* Patient */
router.get("/me/prescriptions", authenticate, listMyPrescriptions);
router.get("/me", authenticate, listMyRefills);
router.post("/", authenticate, createRefillRequest);

/* Provider */
router.get("/provider", authenticate, listProviderRefills);
router.patch("/:id", authenticate, decideRefill);

export default router;
