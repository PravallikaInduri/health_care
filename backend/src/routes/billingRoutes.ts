import { Router } from "express";

import {
  generateBill,
  listMyBills,
  listMyAppointmentPayments,
  listMyLabCharges,
  listMyPharmacyCharges,
  getMyBill,
  payBill
} from "../controllers/billingController";

import { authenticate } from "../middleware/authMiddleware";

const router = Router();

/* Provider / Admin */
router.post(
  "/from-encounter/:encounterId",
  authenticate,
  generateBill
);

/* Patient */
router.get("/me", authenticate, listMyBills);
router.get("/me/appointments", authenticate, listMyAppointmentPayments);
router.get("/me/labs", authenticate, listMyLabCharges);
router.get("/me/pharmacy", authenticate, listMyPharmacyCharges);
router.get("/:id", authenticate, getMyBill);
router.post("/:id/pay", authenticate, payBill);

export default router;
