import { Router } from "express";

import {
  getPharmacyMe,
  getPharmacyStats,
  listPrescriptions,
  getPrescriptionById,
  dispensePrescription,
  listRefillRequests,
  dispenseRefillRequest,
  searchMedications,
  markPrescriptionPaid,
  listPharmacyMedicines,
  addPharmacyMedicine,
  updatePharmacyMedicine,
  deletePharmacyMedicine
} from "../controllers/pharmacyController";

import {
  authenticate,
  authorize
} from "../middleware/authMiddleware";

const router = Router();

/* All pharmacy routes require an authenticated PHARMACY user. */
router.use(authenticate, authorize("PHARMACY"));

router.get("/me", getPharmacyMe);
router.get("/stats", getPharmacyStats);

router.get("/prescriptions", listPrescriptions);
router.get("/prescriptions/:id", getPrescriptionById);
router.post(
  "/prescriptions/:id/dispense",
  dispensePrescription
);
router.post("/prescriptions/:id/paid", markPrescriptionPaid);

/* Pharmacy medicine catalogue (per-facility prices) */
router.get("/medicines", listPharmacyMedicines);
router.post("/medicines", addPharmacyMedicine);
router.patch("/medicines/:id", updatePharmacyMedicine);
router.delete("/medicines/:id", deletePharmacyMedicine);

router.get("/refill-requests", listRefillRequests);
router.post(
  "/refill-requests/:id/dispense",
  dispenseRefillRequest
);

router.get("/medications", searchMedications);

export default router;
