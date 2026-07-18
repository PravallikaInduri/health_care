import { Router } from "express";

import {
  getAdminStats,
  getAuditLogs,
  getPendingDoctors,
  getDoctorById,
  approveDoctor,
  rejectDoctor,
  getDoctorDocument,
  getPendingHospitals,
  approveHospital,
  rejectHospital,
  getHospitalDocument,
  listDoctors,
  listPatients,
  getPatientFullProfile,
  getDoctorSchedule,
  listFacilities,
  getFacilityById,
  getFacilityWithProviders,
  getAssignableProvidersForFacility,
  createFacility,
  updateFacility,
  deleteFacility,
  listProviderFacilitiesAdmin,
  assignFacilityToProvider,
  removeFacilityFromProvider,
  listDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listFacilityDepartmentsAdmin,
  listDepartmentFacilities,
  attachDepartmentToFacility,
  detachDepartmentFromFacility,
  listProviderDepartmentsAdmin,
  attachDepartmentToProvider,
  detachDepartmentFromProvider
} from "../controllers/adminController";

import {
  markProviderUnavailable,
  listUnavailabilities,
  listAffectedAppointments
} from "../controllers/appointmentBookingController";

import {
  authenticate,
  authorize,
  requireAdmin
} from "../middleware/authMiddleware";

/* OPS users share doctor-unavailability tooling with Admins
   per the Sprint 8 brief ("Admin / Ops Dashboard"). */
const requireAdminOrOps = authorize("ADMIN", "OPS");

const router = Router();

/* ----------------------------------------------------------------
   Doctor unavailability — accessible by ADMIN or OPS per Sprint 8.
   Registered BEFORE the router-wide ADMIN guard so OPS users can use
   them without gaining access to admin-only endpoints below.
-----------------------------------------------------------------*/
router.post(
  "/providers/:id/unavailability",
  authenticate,
  requireAdminOrOps,
  markProviderUnavailable
);
router.get(
  "/unavailability",
  authenticate,
  requireAdminOrOps,
  listUnavailabilities
);
router.get(
  "/appointments/affected/:overrideId",
  authenticate,
  requireAdminOrOps,
  listAffectedAppointments
);

/*
All other admin endpoints require an authenticated ADMIN.
The guard is applied router-wide so every existing route is
covered uniformly.
*/
router.use(authenticate, requireAdmin);

router.get(
  "/stats",
  getAdminStats
);

router.get(
  "/audit-logs",
  getAuditLogs
);

/* Doctors directory (Sprint 2) */
router.get(
  "/doctors",
  listDoctors
);

router.get(
  "/doctors/pending",
  getPendingDoctors
);

router.get(
  "/doctors/:id",
  getDoctorById
);

router.get(
  "/doctors/:id/document",
  getDoctorDocument
);

router.get(
  "/doctors/:id/schedule",
  getDoctorSchedule
);

router.patch(
  "/doctors/:id/approve",
  approveDoctor
);

router.patch(
  "/doctors/:id/reject",
  rejectDoctor
);

/* Hospital registration verification (Sprint 9) */
router.get(
  "/hospitals/pending",
  getPendingHospitals
);

router.get(
  "/hospitals/:id/document",
  getHospitalDocument
);

router.patch(
  "/hospitals/:id/approve",
  approveHospital
);

router.patch(
  "/hospitals/:id/reject",
  rejectHospital
);

/* Patients directory (Sprint 2) */
router.get(
  "/patients",
  listPatients
);

router.get(
  "/patients/:id",
  getPatientFullProfile
);

/* Facility management (Sprint 3) */
router.get(
  "/facilities",
  listFacilities
);

router.post(
  "/facilities",
  createFacility
);

router.get(
  "/facilities/:id",
  getFacilityById
);

router.get(
  "/facilities/:id/providers",
  getFacilityWithProviders
);

router.get(
  "/facilities/:id/assignable-providers",
  getAssignableProvidersForFacility
);

router.put(
  "/facilities/:id",
  updateFacility
);

router.delete(
  "/facilities/:id",
  deleteFacility
);

/* Provider <-> Facility assignment (Sprint 3) */
router.get(
  "/providers/:providerId/facilities",
  listProviderFacilitiesAdmin
);

router.post(
  "/providers/:providerId/facilities",
  assignFacilityToProvider
);

router.delete(
  "/providers/:providerId/facilities/:facilityId",
  removeFacilityFromProvider
);

/* Department management (Sprint 7) */
router.get("/departments", listDepartments);
router.post("/departments", createDepartment);
router.get("/departments/:id", getDepartmentById);
router.get("/departments/:id/facilities", listDepartmentFacilities);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

/* Facility ↔ Department (Sprint 7) */
router.get(
  "/facilities/:id/departments",
  listFacilityDepartmentsAdmin
);
router.post(
  "/facilities/:id/departments",
  attachDepartmentToFacility
);
router.delete(
  "/facilities/:id/departments/:deptId",
  detachDepartmentFromFacility
);

/* Provider ↔ Department (Sprint 7) */
router.get(
  "/providers/:providerId/departments",
  listProviderDepartmentsAdmin
);
router.post(
  "/providers/:providerId/departments",
  attachDepartmentToProvider
);
router.delete(
  "/providers/:providerId/departments/:deptId",
  detachDepartmentFromProvider
);

export default router;
