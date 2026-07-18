import express from "express";
import {
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getMyAppointments,
  getAvailability,
  getAvailabilityForFacility,
  getBookableProviders,
  getProviderFacilities
} from "../controllers/appointmentController";

import {
  listHospitals,
  getHospitalById,
  getHospitalDepartments,
  getHospitalDepartmentDoctors
} from "../controllers/hospitalController";

import {
  getDoctorPublicProfile,
  listDoctorReviews,
  createDoctorReview
} from "../controllers/doctorPublicController";

import {
  draftAppointment,
  payAppointment,
  getAppointmentDetail,
  cancelBooking,
  getAlternatives,
  reassignAppointment,
  getMyAppointmentsBooking
} from "../controllers/appointmentBookingController";

import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

/* ----------------------------------------------------------------
   HOSPITAL DIRECTORY (Sprint 7) — public read for authenticated
   patients (and other roles); writes are PATIENT-only.
-----------------------------------------------------------------*/
router.get("/hospitals", authenticate, listHospitals);
router.get("/hospitals/:id", authenticate, getHospitalById);
router.get(
  "/hospitals/:id/departments",
  authenticate,
  getHospitalDepartments
);
router.get(
  "/hospitals/:id/departments/:deptId/doctors",
  authenticate,
  getHospitalDepartmentDoctors
);

/* DOCTOR public profile + reviews */
router.get(
  "/doctors/:providerId",
  authenticate,
  getDoctorPublicProfile
);
router.get(
  "/doctors/:providerId/reviews",
  authenticate,
  listDoctorReviews
);
router.post(
  "/doctors/:providerId/reviews",
  authenticate,
  createDoctorReview
);

/* ----------------------------------------------------------------
   LEGACY one-page booking (kept for backwards compatibility)
-----------------------------------------------------------------*/
router.get(
  "/providers",
  authenticate,
  getBookableProviders
);

router.get(
  "/providers/:providerId/facilities",
  authenticate,
  getProviderFacilities
);

router.get(
  "/availability/:providerId/:date",
  authenticate,
  getAvailability
);

/* New facility-aware availability used by the hospital flow */
router.get(
  "/availability/:providerId/:facilityId/:date",
  authenticate,
  getAvailabilityForFacility
);

/* ----------------------------------------------------------------
   ENTERPRISE BOOKING (Sprint 8)
   draft → pay → cancel/alternatives/reassign
-----------------------------------------------------------------*/
router.post("/draft", authenticate, draftAppointment);
router.get("/my", authenticate, getMyAppointmentsBooking);
router.post("/:id/pay", authenticate, payAppointment);
router.post("/:id/cancel", authenticate, cancelBooking);
router.get("/:id/alternatives", authenticate, getAlternatives);
router.post("/:id/reassign", authenticate, reassignAppointment);

router.post("/", authenticate, bookAppointment);
router.patch("/:id", authenticate, rescheduleAppointment);
router.delete("/:id", authenticate, cancelAppointment);
router.get("/", authenticate, getMyAppointments);

/* GET /:id detail must be last — it would otherwise eat /availability */
router.get("/:id", authenticate, getAppointmentDetail);

export default router;
