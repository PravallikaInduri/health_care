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

export const registerPatient =
async (req: AuthenticatedRequest,res: Response) => {

  try {

    const result =
      await registerPatientService(
        req.body
      );

    return res.status(200).json({
      success:true,
      message:
      "OTP sent",
      data: result
    });

  } catch (error) {

    return res.status(400).json({
      message: errorMessage(error)
    });

  }
};

export const verifyOTP =
async (req: AuthenticatedRequest,res: Response) => {

  try {

    const { email, otp } = req.body;

    const result =
      await verifyOTPService(
        email,
        otp,
        getMeta(req)
      );

    return res.status(200).json({
      success:true,
      data:result
    });

  } catch (error) {

    return res.status(400).json({
      message: errorMessage(error)
    });

  }
};

export const registerDoctor =
async(req: AuthenticatedRequest,res: Response)=>{

 try{

   const result =
   await registerDoctorService(
     req.body,
     req.file
   );

   return res.status(200).json({
     success:true,
     message:"OTP sent",
     data:result
   });

 }catch (error){

   return res.status(400).json({
     message: errorMessage(error)
   });

 }

};

export const verifyDoctorOTP =
async(req: AuthenticatedRequest,res: Response)=>{

 try{

   const {
     email,
     otp
   } = req.body;

   const result =
   await verifyDoctorOTPService(
     email,
     otp,
     getMeta(req)
   );

   return res.status(200).json({
     success:true,
     data:result
   });

 }catch (error){

   return res.status(400).json({
     message: errorMessage(error)
   });

 }

};

export const registerHospital =
async (req: AuthenticatedRequest, res: Response) => {

  try {

    const result =
      await registerHospitalService(
        req.body,
        req.file
      );

    return res.status(200).json({
      success: true,
      message: "OTP sent",
      data: result
    });

  } catch (error) {

    return res.status(400).json({
      message: errorMessage(error)
    });

  }

};

export const verifyHospitalOTP =
async (req: AuthenticatedRequest, res: Response) => {

  try {

    const { email, otp } = req.body;

    const result =
      await verifyHospitalOTPService(
        email,
        otp,
        getMeta(req)
      );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {

    return res.status(400).json({
      message: errorMessage(error)
    });

  }

};


/* ----------------------------------------------------------------
   SPRINT 4 — Forgot password
-----------------------------------------------------------------*/

export const registerPharmacy = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const result = await registerPharmacyService(
      req.body ?? {},
      getMeta(req)
    );
    return res.status(201).json({
      success: true,
      message: "Pharmacy account created — please log in",
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: errorMessage(error)
    });
  }
};
