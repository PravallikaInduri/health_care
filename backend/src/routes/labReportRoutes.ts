import { Router } from "express";
import {
  deleteLabReport,
  downloadLabReport,
  getLabReport,
  getLabReportStats,
  listDoctorLabReports,
  listMyPatientLabReports,
  listPatientLabReports,
  updateLabReport,
  uploadLabReport,
} from "../controllers/labReportController";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { upload } from "../middleware/uploadMiddleware";

const router = Router();

router.use(authenticate);

router.get(
  "/lab-reports/stats",
  authorize("LAB_TECH", "LAB_ADMIN"),
  getLabReportStats
);
router.post(
  "/lab-reports/upload",
  authorize("LAB_TECH", "LAB_ADMIN"),
  upload.single("file"),
  uploadLabReport
);
router.put(
  "/lab-reports/:id",
  authorize("LAB_TECH", "LAB_ADMIN"),
  updateLabReport
);
router.get("/lab-reports/:id", getLabReport);
router.get("/lab-reports/:id/download", downloadLabReport);
router.delete(
  "/lab-reports/:id",
  authorize("LAB_TECH", "LAB_ADMIN", "HOSPITAL_ADMIN", "ADMIN"),
  deleteLabReport
);

router.get("/patients/me/lab-reports", authorize("PATIENT"), listMyPatientLabReports);
router.get("/patients/:id/lab-reports", listPatientLabReports);
router.get("/doctors/:id/lab-reports", authorize("PROVIDER"), listDoctorLabReports);

export default router;
