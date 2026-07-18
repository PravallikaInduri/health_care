import { Router } from "express";

import {
  getHospitalOverview,
  getHospitalDoctors,
  getHospitalUnits,
  createHospitalUnit,
  updateHospitalUnit,
  deleteHospitalUnit,
  getHospitalStaff,
  createHospitalStaff,
  updateHospitalStaff,
  deleteHospitalStaff,
  getHospitalBilling,
  updateHospitalDoctorFee,
  listHospitalDepartments,
  createHospitalDepartment,
  updateHospitalDepartment,
  deleteHospitalDepartment,
  attachHospitalDepartment,
  detachHospitalDepartment,
  listHospitalPatients,
} from "../controllers/hospitalPortalController";

import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();

/* All hospital-portal routes require an authenticated HOSPITAL_ADMIN. */
router.use(authenticate, authorize("HOSPITAL_ADMIN"));

router.get("/overview", getHospitalOverview);
router.get("/doctors", getHospitalDoctors);
router.patch("/doctors/:id/fee", updateHospitalDoctorFee);

router.get("/units", getHospitalUnits);
router.post("/units", createHospitalUnit);
router.patch("/units/:id", updateHospitalUnit);
router.delete("/units/:id", deleteHospitalUnit);

router.get("/staff", getHospitalStaff);
router.post("/staff", createHospitalStaff);
router.patch("/staff/:id", updateHospitalStaff);
router.delete("/staff/:id", deleteHospitalStaff);

router.get("/billing", getHospitalBilling);

/* Departments */
router.get("/departments", listHospitalDepartments);
router.post("/departments", createHospitalDepartment);
router.patch("/departments/:deptId", updateHospitalDepartment);
router.delete("/departments/:deptId", deleteHospitalDepartment);
router.post("/departments/:deptId/attach", attachHospitalDepartment);
router.delete("/departments/:deptId/detach", detachHospitalDepartment);

/* Patients (read-only) */
router.get("/patients", listHospitalPatients);

export default router;
