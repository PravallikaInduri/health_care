import { Response } from "express";
import {
  registerPatientService,
  registerDoctorService,
 verifyDoctorOTPService,
  registerHospitalService,
  verifyHospitalOTPService,
  verifyOTPService,
  refreshTokenService,
  logoutService,
  loginService,
  forgotPasswordService,
  verifyResetOtpService,
  resetPasswordService,
  registerPharmacyService,
  verifyLogin2FAService,
  changePasswordService,
  getTwoFactorStatusService,
  sendTwoFactorCodeService,
  setTwoFactorService
} from "../services/auth.service";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage } from "../utils/controllerHelpers";

const getMeta = (req: AuthenticatedRequest) => ({
  ip:
    (req.headers["x-forwarded-for"] as string) ||
    req.ip ||
    req.socket?.remoteAddress ||
    null,
  userAgent: req.headers["user-agent"] || null
});

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    await changePasswordService(
      req.user.id,
      currentPassword,
      newPassword,
      getMeta(req)
    );
    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

/* Authenticated: read current 2FA status. */

export const getTwoFactorStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getTwoFactorStatusService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

/* Authenticated: email a code to enable or disable 2FA. */

export const sendTwoFactorCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purpose = req.body?.purpose === "DISABLE" ? "DISABLE" : "ENABLE";
    const result = await sendTwoFactorCodeService(req.user.id, purpose);
    return res.status(200).json({
      success: true,
      message: "A verification code has been sent to your email.",
      ...result
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

/* Authenticated: confirm the code and flip 2FA on/off. */

export const setTwoFactor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, enable } = req.body ?? {};
    const result = await setTwoFactorService(
      req.user.id,
      code,
      enable === true || enable === "true",
      getMeta(req)
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const forgotPassword = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { email } = req.body ?? {};

    await forgotPasswordService(email, getMeta(req));

    /*
    Always return a generic success message to prevent
    enumeration of registered emails.
    */
    return res.status(200).json({
      success: true,
      message:
        "If an account exists for this email, a verification code has been sent."
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const verifyResetOtp = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { email, otp } = req.body ?? {};

    const result = await verifyResetOtpService(
      email,
      otp,
      getMeta(req)
    );

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const {
      email,
      otp,
      newPassword,
      confirmPassword
    } = req.body ?? {};

    await resetPasswordService(
      email,
      otp,
      newPassword,
      confirmPassword,
      getMeta(req)
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

/* PHARMACY REGISTRATION (Sprint 6) */
