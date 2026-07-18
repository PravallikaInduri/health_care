import express from "express";

import {
  getProfile,
  updateProfile,
  createEmergencyContact,
  createDependent,
  createInsurance,
  getEncounters,
  getEncounterById,
  getLabs,
  getLabReportById,
  uploadLabResult,
  downloadLabResult,
  getInsurance,
  updateInsurance,
  deleteInsurance,
  getMyDependents,
  getMyEmergencyContacts,
  getMyPrescriptions,
  requestRefill
} from "../controllers/patientController";

import { authenticate } from "../middleware/authMiddleware";
import { upload } from "../middleware/uploadMiddleware";

const router = express.Router();

router.get("/me",authenticate,getProfile);
router.patch("/me",authenticate,updateProfile);

router.post("/me/emergency-contacts",authenticate,createEmergencyContact);
router.get("/me/emergency-contacts",authenticate,getMyEmergencyContacts);
router.post("/me/dependents",authenticate,createDependent);
router.get("/me/dependents",authenticate,getMyDependents);

/* Insurance (Sprint 4) */
router.post("/me/insurance",authenticate,createInsurance);
router.get("/me/insurance",authenticate,getInsurance);
router.patch("/me/insurance/:id",authenticate,updateInsurance);
router.delete("/me/insurance/:id",authenticate,deleteInsurance);

/* Encounters (Sprint 4) */
router.get("/me/encounters",authenticate,getEncounters);
router.get("/me/encounters/:id",authenticate,getEncounterById);

/* Lab reports (Sprint 4) */
router.get("/me/labs",authenticate,getLabs);
router.get("/me/labs/:id",authenticate,getLabReportById);

/* Prescriptions & refills (Sprint 6) */
router.get("/me/prescriptions",authenticate,getMyPrescriptions);
router.post(
  "/me/prescriptions/:id/refill",
  authenticate,
  requestRefill
);

/* Lab result uploads (Sprint 6) */
router.post(
  "/me/labs/:id/results",
  authenticate,
  upload.single("file"),
  uploadLabResult
);
router.get(
  "/me/lab-results/:resultId/download",
  authenticate,
  downloadLabResult
);

export default router;