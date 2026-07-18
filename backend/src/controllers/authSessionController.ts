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

export const login =
async(req: AuthenticatedRequest,res: Response)=>{

  try{

    const {
      email,
      password
    } = req.body;

    const result =
      await loginService(
        email,
        password,
        getMeta(req)
      );

    return res.json(result);

  }catch (error){

    return res.status(400).json({
      message: errorMessage(error)
    });

  }
};

/* Complete a login that was paused for two-factor authentication. */

export const verifyLogin2FA = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, code } = req.body ?? {};
    const result = await verifyLogin2FAService(email, code, getMeta(req));
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: errorMessage(error) });
  }
};

/* Authenticated: change password from the account/profile page. */

export const refreshToken =
async(
 req: AuthenticatedRequest,
 res: Response
)=>{

 try{

  const {
   refreshToken
  } = req.body;

  const result =
  await refreshTokenService(
   refreshToken
  );

  return res.json({
   success:true,
   data:result
  });

 }catch (error){

  return res.status(400).json({
   message: errorMessage(error)
  });

 }

};

export const logout =
async(
 req: AuthenticatedRequest,
 res: Response
)=>{

 try{

  const {
   refreshToken
  } = req.body;

  const result =
  await logoutService(
   refreshToken
  );

  return res.json({
   success:true,
   data:result
  });

 }catch (error){

  return res.status(400).json({
   message: errorMessage(error)
  });

 }

};
