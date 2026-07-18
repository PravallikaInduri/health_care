import { Router } from "express";

import {
  registerPatient,
  registerDoctor,
  verifyDoctorOTP,
  registerHospital,
  verifyHospitalOTP,
  verifyOTP,
   refreshToken,
 logout,
  login,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  registerPharmacy,
  verifyLogin2FA,
  changePassword,
  getTwoFactorStatus,
  sendTwoFactorCode,
  setTwoFactor
} from "../controllers/auth.controller";
import { upload } from "../middleware/uploadMiddleware";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.post("/register/patient",registerPatient);

router.post("/verify-otp",verifyOTP);

router.post("/login",login);

/* Two-factor login completion (public — password already verified) */
router.post("/login/2fa", verifyLogin2FA);

router.post("/refresh-token",refreshToken);

router.post("/logout",logout);

router.post("/register/doctor",upload.single("doctorIdCard"),registerDoctor);

router.post("/verify-doctor-otp",verifyDoctorOTP);

/* Hospital registration (Sprint 9) */
router.post("/register/hospital",upload.single("proofDocument"),registerHospital);

router.post("/verify-hospital-otp",verifyHospitalOTP);

/* Forgot password (Sprint 4) */
router.post("/forgot-password",forgotPassword);
router.post("/verify-reset-otp",verifyResetOtp);
router.post("/reset-password",resetPassword);

/* Pharmacy registration (Sprint 6) */
router.post("/register/pharmacy", registerPharmacy);

/* Account security — all authenticated roles */
router.post("/change-password", authenticate, changePassword);
router.get("/2fa/status", authenticate, getTwoFactorStatus);
router.post("/2fa/send-code", authenticate, sendTwoFactorCode);
router.post("/2fa/set", authenticate, setTwoFactor);

export default router;