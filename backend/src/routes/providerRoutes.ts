import { Router } from "express";

import {
  getMyProfile,
  updateMyProfile,
  createSchedule,
  getSchedules,
  updateSchedule,
  deleteSchedule,
  createOverride,
  getOverrides,
  deleteOverride,
  createEncounter,
  createDiagnosis,
  createPrescription,
  createLabOrder,
  getMyLabOrders,
  getMyLabOrderById,
  addLabResults,
  getProviderAvailability,
  getProviderAppointments,
  updateAppointmentStatus,
  getMyPrescriptions,
  getProviderPatients,
  getProviderPatientDetail,
  downloadProviderPatientDocument,
  downloadProviderLabResult,
  listPharmacyFacilities
} from "../controllers/providerController";

import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.get("/me", authenticate, getMyProfile);

router.put("/me", authenticate, updateMyProfile);

router.post("/schedules", authenticate, createSchedule);



router.post("/encounters", authenticate, createEncounter);

router.post("/diagnoses", authenticate, createDiagnosis);

router.post("/prescriptions", authenticate, createPrescription);

router.post("/lab-orders", authenticate, createLabOrder);

/* Provider Lab Orders Dashboard (Sprint 5) */
router.get("/lab-orders", authenticate, getMyLabOrders);
router.get("/lab-orders/:id", authenticate, getMyLabOrderById);
router.post("/lab-orders/:id/results", authenticate, addLabResults);

/* Provider Prescriptions history (Sprint 6) */
router.get("/prescriptions", authenticate, getMyPrescriptions);

/* Pharmacy facility picker for the Encounter UI (Sprint 12) */
router.get("/pharmacies", authenticate, listPharmacyFacilities);

/* My patients (people treated by this provider) */
router.get("/patients", authenticate, getProviderPatients);
router.get("/patients/:patientId", authenticate, getProviderPatientDetail);
router.get(
  "/patients/:patientId/documents/:documentId/download",
  authenticate,
  downloadProviderPatientDocument
);
router.get(
  "/lab-results/:resultId/download",
  authenticate,
  downloadProviderLabResult
);

router.get(
  "/schedules",
  authenticate,
  getSchedules
);

router.put(
  "/schedules/:id",
  authenticate,
  updateSchedule
);

router.delete(
  "/schedules/:id",
  authenticate,
  deleteSchedule
);

router.post(
  "/schedules/override",
  authenticate,
  createOverride
);

router.get(
  "/schedules/overrides",
  authenticate,
  getOverrides
);

router.delete(
  "/schedules/overrides/:id",
  authenticate,
  deleteOverride
);
router.get(
  "/appointments",
  authenticate,
  getProviderAppointments
);
router.patch(
  "/appointments/:id/status",
  authenticate,
  updateAppointmentStatus
);
router.get(
  "/:id/availability",
  getProviderAvailability
);

export default router;
