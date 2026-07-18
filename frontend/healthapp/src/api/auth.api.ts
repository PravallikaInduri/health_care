import api from "./axios";

export const registerPatient = (data: any) =>
  api.post("/auth/register/patient", data);

export const verifyPatientOTP = (
  email: string,
  otp: string
) =>
  api.post("/auth/verify-otp", {
    email,
    otp,
  });

export const verifyDoctorOTP = (
  email: string,
  otp: string
) =>
  api.post("/auth/verify-doctor-otp", {
    email,
    otp,
  });

export const registerDoctor = (
  formData: FormData
) =>
  api.post(
    "/auth/register/doctor",
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );

export const verifyHospitalOTP = (
  email: string,
  otp: string
) =>
  api.post("/auth/verify-hospital-otp", {
    email,
    otp,
  });

export const registerHospital = (
  formData: FormData
) =>
  api.post(
    "/auth/register/hospital",
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );



export const loginUser = (data: {
  email: string;
  password: string;
}) =>
  api.post("/auth/login", data);

/* Forgot password (Sprint 4) */
export const forgotPassword = (email: string) =>
  api.post("/auth/forgot-password", { email });

export const verifyResetOtp = (
  email: string,
  otp: string
) =>
  api.post("/auth/verify-reset-otp", { email, otp });

export const resetPassword = (data: {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}) => api.post("/auth/reset-password", data);

/* ----------------------------------------------------------------
   Account security — 2FA at login + change password (all roles)
-----------------------------------------------------------------*/

/* Completes a login that the server paused for two-factor auth. */
export const verifyLogin2FA = (email: string, code: string) =>
  api.post("/auth/login/2fa", { email, code });

export const changePassword = (data: {
  currentPassword: string;
  newPassword: string;
}) => api.post("/auth/change-password", data);

export const getTwoFactorStatus = () => api.get("/auth/2fa/status");

export const sendTwoFactorCode = (purpose: "ENABLE" | "DISABLE") =>
  api.post("/auth/2fa/send-code", { purpose });

export const setTwoFactor = (code: string, enable: boolean) =>
  api.post("/auth/2fa/set", { code, enable });
