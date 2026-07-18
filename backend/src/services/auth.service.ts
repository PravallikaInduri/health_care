import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import bcrypt from "bcrypt";
import type { JwtPayload } from "jsonwebtoken";

import { sendDoctorApprovalEmail, sendDoctorRejectEmail } from "../utils/mail";
import { generateOTP } from "../utils/otp";
import {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendTwoFactorCodeEmail,
} from "../utils/mail";
import { generateToken,generateRefreshToken } from "../utils/jwt";
import { writeAuditLog } from "./auditService";

interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

interface UploadedProofFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

interface RegisterPatientInput extends Record<string, never> {}

interface RegisterDoctorInput extends Record<string, never> {}

interface RegisterHospitalInput extends Record<string, never> {}

interface RegisterPharmacyInput {
  email?: string;
  password?: string;
  name?: string;
}

const SUPPORTED_VERIFICATION_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

export const registerPatientService = async (
  data: RegisterPatientInput
) => {

  const {
    firstName,
    lastName,
    dob,
    sex,
    phone,
    email,
    password
  } = data;

  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM users WHERE email=?",
    [email]
  );

  if (existing.length > 0) {
    throw new Error("Email already exists");
  }

  const otp = generateOTP();

  const hashedPassword = await bcrypt.hash(
    password,
    10
  );

  const expiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  );

  await pool.query(
    `
    INSERT INTO email_otps
    (
      id,
      email,
      otp,
      first_name,
      last_name,
      dob,
      sex,
      phone,
      password_hash,
      expires_at
    )
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuid(),
      email,
      otp,
      firstName,
      lastName,
      dob,
      sex,
      phone,
      hashedPassword,
      expiresAt
    ]
  );

  await sendOTPEmail(email, otp);

  return {
    message: "OTP sent successfully"
  };
};

export const verifyOTPService = async (
  email: string,
  otp: string,
  meta: RequestMeta = {}
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM email_otps
    WHERE email=?
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [email]
  );

  if (rows.length === 0) {
    throw new Error("OTP not found");
  }

  const record = rows[0];

  if (record.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  if (
    new Date() >
    new Date(record.expires_at)
  ) {
    throw new Error("OTP expired");
  }

  const userId = `U${Date.now()}`;

  await pool.query(
    `
    INSERT INTO users
    (
      id,
      email,
      password_hash,
      role
    )
    VALUES
    (?, ?, ?, 'PATIENT')
    `,
    [
      userId,
      record.email,
      record.password_hash
    ]
  );

  const patientId = `P${Date.now()}`;

  await pool.query(
    `
    INSERT INTO patients
    (
      id,
      user_id,
      mrn,
      first_name,
      last_name,
      dob,
      sex,
      phone,
      email
    )
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      patientId,
      userId,
      `MRN${Date.now()}`,
      record.first_name,
      record.last_name,
      record.dob,
      record.sex,
      record.phone,
      record.email
    ]
  );

  await pool.query(
    `
    DELETE FROM email_otps
    WHERE id=?
    `,
    [record.id]
  );

  const token = generateToken(
    userId,
    "PATIENT"
  );

  await writeAuditLog({
    actorId: userId,
    actorRole: "PATIENT",
    action: "ACCOUNT_CREATED",
    resourceType: "patient",
    resourceId: patientId,
    patientId: patientId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    success: true,
    reason: null
  });

  return {
    token,
    userId,
    patientId
  };
};



export const loginService = async (
  email: string,
  password: string,
  meta: RequestMeta = {}
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT *
      FROM users
      WHERE email=?
      `,
      [email]
    );

  if (rows.length === 0) {
    await writeAuditLog({
      actorRole: null,
      action: "LOGIN",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: false,
      reason: `User not found: ${email}`
    });
    throw new Error(
      "User not found"
    );
  }

  const user = rows[0];

  const valid =
    await bcrypt.compare(
      password,
      user.password_hash
    );

  if (!valid) {
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "LOGIN",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: false,
      reason: "Invalid credentials"
    });
    throw new Error(
      "Invalid credentials"
    );
  }

  // Approval gate — doctors and hospitals must be approved by an admin
  if (
    (user.role === "PROVIDER" ||
      user.role === "HOSPITAL_ADMIN") &&
    user.approval_status !== "APPROVED"
  ) {
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "LOGIN",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: false,
      reason: "Account pending admin approval"
    });
    throw new Error(
      "Your account is pending admin approval"
    );
  }

  // Disabled accounts (e.g. a hospital staff member deactivated by their
  // hospital admin) cannot sign in.
  if (user.is_active === 0) {
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "LOGIN",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: false,
      reason: "Account disabled"
    });
    throw new Error(
      "Your account has been disabled. Please contact your administrator."
    );
  }

  // Operational portals sign in with password-only JWT sessions. Patient,
  // doctor and hospital-owner flows keep their existing 2FA behavior.
  const passwordOnlyRoles = ["ADMIN", "PHARMACY", "LAB_TECH", "LAB_ADMIN"];
  if (passwordOnlyRoles.includes(String(user.role))) {
    const tokens = await issueAuthTokens(user);

    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "LOGIN",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: true,
      reason: null
    });

    return tokens;
  }

  // Mandatory two-factor authentication for every other login: a correct
  // password is never enough on its own. We email a one-time code and
  // require it via /auth/login/2fa before a token is issued.
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `DELETE FROM two_factor_codes WHERE user_id = ? AND purpose = 'LOGIN'`,
    [user.id]
  );
  await pool.query(
    `
    INSERT INTO two_factor_codes (id, user_id, code, purpose, expires_at)
    VALUES (?, ?, ?, 'LOGIN', ?)
    `,
    [uuid(), user.id, code, expiresAt]
  );

  try {
    await sendTwoFactorCodeEmail(user.email, code);
  } catch (mailError) {
    logger.error("Failed to send 2FA login code:", (mailError as Error).message);
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "LOGIN",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: false,
      reason: "2FA email delivery failed"
    });
    throw new Error(
      "We couldn't send your login code by email. Please try again in a moment."
    );
  }

  await writeAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: "LOGIN",
    ip: meta.ip,
    userAgent: meta.userAgent,
    success: true,
    reason: "Password verified — awaiting 2FA code"
  });

  return {
    requires2FA: true,
    email: user.email
  };
};

/* Issue an access + refresh token pair and persist the refresh token. */
const issueAuthTokens = async (user: RowDataPacket) => {
  const accessToken = generateToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  await pool.query(
    `
    INSERT INTO refresh_tokens
      (id, user_id, refresh_token, expires_at)
    VALUES
      (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))
    `,
    [uuid(), user.id, refreshToken]
  );

  return {
    accessToken,
    refreshToken,
    role: user.role,
    userId: user.id
  };
};

/* Complete a login that was paused for two-factor authentication. */
export const verifyLogin2FAService = async (
  email: string,
  code: string,
  meta: RequestMeta = {}
) => {
  if (!email || !code) {
    throw new Error("Email and code are required");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM users WHERE email = ?`,
    [email]
  );
  if (rows.length === 0) {
    throw new Error("User not found");
  }
  const user = rows[0];

  const [codes] = await pool.query<RowDataPacket[]>(
    `
    SELECT * FROM two_factor_codes
    WHERE user_id = ? AND purpose = 'LOGIN'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [user.id]
  );

  if (codes.length === 0) {
    throw new Error("No pending code. Please sign in again.");
  }

  const record = codes[0];

  if (String(record.code) !== String(code)) {
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "LOGIN",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: false,
      reason: "Invalid 2FA code"
    });
    throw new Error("Invalid code");
  }

  if (new Date() > new Date(record.expires_at)) {
    throw new Error("Code expired. Please sign in again.");
  }

  await pool.query(`DELETE FROM two_factor_codes WHERE id = ?`, [record.id]);

  const tokens = await issueAuthTokens(user);

  await writeAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: "LOGIN",
    ip: meta.ip,
    userAgent: meta.userAgent,
    success: true,
    reason: "2FA verified"
  });

  return tokens;
};

import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

export const refreshTokenService =
async(
 refreshToken:string
)=>{

 if(!refreshToken){
  throw new Error(
   "Refresh token required"
  );
 }

 const [rows] = await pool.query<RowDataPacket[]>(
 `
 SELECT *
 FROM refresh_tokens
 WHERE refresh_token=?
 `,
 [refreshToken]
 );

 if(rows.length === 0){
  throw new Error(
   "Invalid refresh token"
  );
 }

 const decoded =
 jwt.verify(
  refreshToken,
  process.env.JWT_REFRESH_SECRET!
 ) as JwtPayload;

 const [users] = await pool.query<RowDataPacket[]>(
 `
 SELECT *
 FROM users
 WHERE id=?
 `,
 [decoded.userId]
 );

 const user = users[0];

 const accessToken =
  generateToken(
  user.id,
  user.role
 );

 return {
  accessToken
 };
};

export const logoutService =
async(
 refreshToken:string
)=>{

 await pool.query(
 `
 DELETE FROM refresh_tokens
 WHERE refresh_token=?
 `,
 [refreshToken]
 );

 return {
  message:
  "Logout successful"
 };

};


export const registerDoctorService =
async (
  data: RegisterDoctorInput,
  file: UploadedProofFile | undefined
) => {

  const {
    name,
    email,
    password,
    specialty,
    npi_or_mci,
    bio,
    languages
  } = data;

  if (!file) {
    throw new Error(
      "Doctor ID card required"
    );
  }

  if (!SUPPORTED_VERIFICATION_MIME_TYPES.has(file.mimetype)) {
    throw new Error("Doctor verification document must be a PDF, JPG, JPEG, or PNG file");
  }

  await pool.query(`
    DELETE FROM doctor_otps
    WHERE expires_at < NOW()
  `);

  const [existingUser] = await pool.query<RowDataPacket[]>(
      `
      SELECT id
      FROM users
      WHERE email = ?
      `,
      [email]
    );

  if (existingUser.length > 0) {
    throw new Error(
      "Email already registered"
    );
  }

  const [existingProvider] = await pool.query<RowDataPacket[]>(
      `
      SELECT id
      FROM providers
      WHERE npi_or_mci = ?
      `,
      [npi_or_mci]
    );

  if (existingProvider.length > 0) {
    throw new Error(
      "NPI/MCI already registered"
    );
  }
  const [pendingEmail] = await pool.query<RowDataPacket[]>(
      `
      SELECT id
      FROM doctor_otps
      WHERE email = ?
      `,
      [email]
    );

  if (pendingEmail.length > 0) {
    throw new Error(
      "This email already has a pending OTP verification"
    );
  }

  const [pendingLicense] = await pool.query<RowDataPacket[]>(
      `
      SELECT id
      FROM doctor_otps
      WHERE npi_or_mci = ?
      `,
      [npi_or_mci]
    );

  if (pendingLicense.length > 0) {
    throw new Error(
      "This NPI/MCI already has a pending registration"
    );
  }

  const otp = generateOTP();

  const hashedPassword =
    await bcrypt.hash(
      password,
      10
    );

  const expires =
    new Date(
      Date.now() + 10 * 60 * 1000
    );

  await pool.query(
    `
    INSERT INTO doctor_otps
    (
      id,
      email,
      otp,
      name,
      specialty,
      npi_or_mci,
      bio,
      languages,
      password_hash,
      file_name,
      mime_type,
      file_data,
      expires_at
    )
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuid(),
      email,
      otp,
      name,
      specialty,
      npi_or_mci,
      bio,
      JSON.stringify(languages),
      hashedPassword,
      file.originalname,
      file.mimetype,
      file.buffer,
      expires
    ]
  );

  await sendOTPEmail(
    email,
    otp
  );

  return {
    message:
      "OTP sent successfully"
  };
};


export const verifyDoctorOTPService = async (
  email: string,
  otp: string,
  meta: RequestMeta = {}
) => {

  const connection =
    await pool.getConnection();

  try {

    await connection.beginTransaction();

    const [rows] = await connection.query<RowDataPacket[]>(
        `
        SELECT *
        FROM doctor_otps
        WHERE email = ?
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [email]
      );

    if (rows.length === 0) {
      throw new Error(
        "OTP not found"
      );
    }

    const record = rows[0];

    if (record.otp !== otp) {
      throw new Error(
        "Invalid OTP"
      );
    }

    if (
      new Date() >
      new Date(record.expires_at)
    ) {
      throw new Error(
        "OTP expired"
      );
    }


    const [existingUser] = await connection.query<RowDataPacket[]>(
        `
        SELECT id
        FROM users
        WHERE email = ?
        `,
        [record.email]
      );

    if (existingUser.length > 0) {

      await connection.query(
        `
        DELETE FROM doctor_otps
        WHERE id = ?
        `,
        [record.id]
      );

      throw new Error(
        "Email already registered"
      );
    }


    const [existingProvider] = await connection.query<RowDataPacket[]>(
        `
        SELECT id
        FROM providers
        WHERE npi_or_mci = ?
        `,
        [record.npi_or_mci]
      );

    if (existingProvider.length > 0) {

      await connection.query(
        `
        DELETE FROM doctor_otps
        WHERE id = ?
        `,
        [record.id]
      );

      throw new Error(
        "NPI/MCI already registered"
      );
    }

    const userId =
      `U${Date.now()}${Math.floor(
        Math.random() * 1000
      )}`;

    await connection.query(
      `
      INSERT INTO users
      (
        id,
        email,
        password_hash,
        role,
        approval_status
      )
      VALUES
      (?, ?, ?, 'PROVIDER', 'PENDING')
      `,
      [
        userId,
        record.email,
        record.password_hash
      ]
    );

    const providerId =
      `D${Date.now()}${Math.floor(
        Math.random() * 1000
      )}`;

    await connection.query(
      `
      INSERT INTO providers
      (
        id,
        user_id,
        name,
        specialty,
        npi_or_mci,
        bio,
        languages,
        accepting_new,
        verification_status,
        is_verified
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        TRUE,
        'PENDING',
        FALSE
      )
      `,
      [
        providerId,
        userId,
        record.name,
        record.specialty,
        record.npi_or_mci,
        record.bio,
        record.languages
      ]
    );

    await connection.query(
      `
      INSERT INTO provider_documents
      (
        id,
        provider_id,
        document_type,
        file_name,
        mime_type,
        file_data,
        verification_status
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'PENDING'
      )
      `,
      [
        uuid(),
        providerId,
        "DOCTOR_ID",
        record.file_name,
        record.mime_type,
        record.file_data
      ]
    );

    await connection.query(
      `
      DELETE FROM doctor_otps
      WHERE id = ?
      `,
      [record.id]
    );

    await connection.commit();

    await writeAuditLog({
      actorId: userId,
      actorRole: "PROVIDER",
      action: "ACCOUNT_CREATED",
      resourceType: "provider",
      resourceId: providerId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: true,
      reason: null
    });

    return {
      success: true,
      providerId,
      status:
        "Registration successful. Waiting for admin approval."
    };

  } catch (error) {

    await connection.rollback();

    throw error;

  } finally {

    connection.release();

  }
};


/* ----------------------------------------------------------------
 * Hospital registration (mirrors the doctor flow): self-register
 * with a proof document + lab/pharmacy declaration, confirm email
 * via OTP, then wait for admin approval before login is allowed.
 * ---------------------------------------------------------------- */

const toBool = (v: unknown) =>
  v === true || v === "true" || v === "1" || v === 1 ? 1 : 0;

export const registerHospitalService = async (
  data: RegisterHospitalInput,
  file: UploadedProofFile | undefined
) => {

  const {
    name,
    email,
    password,
    phone,
    address,
    city,
    about,
    has_lab,
    has_pharmacy
  } = data;

  if (!name || !email || !password) {
    throw new Error(
      "Hospital name, email and password are required"
    );
  }

  if (!file) {
    throw new Error(
      "A verification document (PDF) is required"
    );
  }

  await pool.query(`
    DELETE FROM hospital_otps
    WHERE expires_at < NOW()
  `);

  const [existingUser] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE email = ?`,
    [email]
  );

  if (existingUser.length > 0) {
    throw new Error("Email already registered");
  }

  const [pendingEmail] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM hospital_otps WHERE email = ?`,
    [email]
  );

  if (pendingEmail.length > 0) {
    throw new Error(
      "This email already has a pending OTP verification"
    );
  }

  const otp = generateOTP();

  const hashedPassword = await bcrypt.hash(password, 10);

  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `
    INSERT INTO hospital_otps
    (
      id,
      email,
      otp,
      name,
      phone,
      address,
      city,
      about,
      password_hash,
      has_lab,
      has_pharmacy,
      file_name,
      mime_type,
      file_data,
      expires_at
    )
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuid(),
      email,
      otp,
      name,
      phone ?? null,
      address ?? null,
      city ?? null,
      about ?? null,
      hashedPassword,
      toBool(has_lab),
      toBool(has_pharmacy),
      file.originalname,
      file.mimetype,
      file.buffer,
      expires
    ]
  );

  await sendOTPEmail(email, otp);

  return { message: "OTP sent successfully" };
};


export const verifyHospitalOTPService = async (
  email: string,
  otp: string,
  meta: RequestMeta = {}
) => {

  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    const [rows] = await connection.query<RowDataPacket[]>(
      `
      SELECT *
      FROM hospital_otps
      WHERE email = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      throw new Error("OTP not found");
    }

    const record = rows[0];

    if (record.otp !== otp) {
      throw new Error("Invalid OTP");
    }

    if (new Date() > new Date(record.expires_at)) {
      throw new Error("OTP expired");
    }

    const [existingUser] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE email = ?`,
      [record.email]
    );

    if (existingUser.length > 0) {
      await connection.query(
        `DELETE FROM hospital_otps WHERE id = ?`,
        [record.id]
      );
      throw new Error("Email already registered");
    }

    const userId =
      `U${Date.now()}${Math.floor(Math.random() * 1000)}`;

    await connection.query(
      `
      INSERT INTO users
      (
        id,
        email,
        password_hash,
        role,
        approval_status
      )
      VALUES
      (?, ?, ?, 'HOSPITAL_ADMIN', 'PENDING')
      `,
      [userId, record.email, record.password_hash]
    );

    const facilityId = uuid();

    await connection.query(
      `
      INSERT INTO facilities
      (
        id,
        name,
        address,
        city,
        phone,
        email,
        about,
        type,
        approval_status,
        has_lab,
        has_pharmacy,
        owner_user_id
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, 'HOSPITAL', 'PENDING', ?, ?, ?)
      `,
      [
        facilityId,
        record.name,
        record.address,
        record.city,
        record.phone,
        record.email,
        record.about,
        record.has_lab,
        record.has_pharmacy,
        userId
      ]
    );

    await connection.query(
      `
      INSERT INTO facility_staff
      (id, user_id, facility_id, staff_role)
      VALUES (?, ?, ?, 'HOSPITAL_ADMIN')
      `,
      [uuid(), userId, facilityId]
    );

    await connection.query(
      `
      INSERT INTO facility_documents
      (
        id,
        facility_id,
        document_type,
        file_name,
        mime_type,
        file_data,
        verification_status
      )
      VALUES
      (?, ?, 'HOSPITAL_PROOF', ?, ?, ?, 'PENDING')
      `,
      [
        uuid(),
        facilityId,
        record.file_name,
        record.mime_type,
        record.file_data
      ]
    );

    await connection.query(
      `DELETE FROM hospital_otps WHERE id = ?`,
      [record.id]
    );

    await connection.commit();

    await writeAuditLog({
      actorId: userId,
      actorRole: "HOSPITAL_ADMIN",
      action: "ACCOUNT_CREATED",
      resourceType: "facility",
      resourceId: facilityId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: true,
      reason: null
    });

    return {
      success: true,
      facilityId,
      status:
        "Registration successful. Waiting for admin approval."
    };

  } catch (error) {

    await connection.rollback();

    throw error;

  } finally {

    connection.release();

  }
};


/* ----------------------------------------------------------------
   SPRINT 4 — Forgot password / OTP reset
-----------------------------------------------------------------*/

const PASSWORD_MIN_LENGTH = 8;

/*
We reuse the existing `email_otps` table for password resets.
Reset rows are distinguished from registration rows by `first_name`
being NULL — registration always inserts a non-null first_name, so the
two flows are isolated without a schema change.
*/

export const forgotPasswordService = async (
  email: string,
  meta: RequestMeta = {}
) => {
  if (!email || typeof email !== "string") {
    throw new Error("Email is required");
  }

  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT id, email, role, is_active FROM users WHERE email = ?`,
    [email]
  );

  if (users.length === 0) {
    /*
    Audit the failed attempt but always respond with a generic
    success-style message at the controller layer to avoid leaking
    which emails are registered.
    */
    await writeAuditLog({
      actorId: null,
      actorRole: null,
      action: "PASSWORD_RESET_REQUESTED",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: false,
      reason: `Unknown email: ${email}`
    });
    return { delivered: false };
  }

  const user = users[0];

  if (user.is_active === 0) {
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "PASSWORD_RESET_REQUESTED",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: false,
      reason: "Account inactive"
    });
    return { delivered: false };
  }

  /* Throttle / dedupe — clear out existing reset rows */
  await pool.query(
    `DELETE FROM email_otps
     WHERE email = ? AND first_name IS NULL`,
    [email]
  );

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `
    INSERT INTO email_otps
    (
      id,
      email,
      otp,
      first_name,
      last_name,
      dob,
      sex,
      phone,
      password_hash,
      expires_at
    )
    VALUES
    (?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?)
    `,
    [uuid(), email, otp, expiresAt]
  );

  await sendPasswordResetEmail(email, otp);

  await writeAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: "PASSWORD_RESET_REQUESTED",
    ip: meta.ip,
    userAgent: meta.userAgent,
    success: true,
    reason: null
  });

  return { delivered: true };
};

const findActiveResetOtp = async (
  email: string,
  otp: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM email_otps
    WHERE email = ?
      AND first_name IS NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [email]
  );

  if (rows.length === 0) {
    throw new Error("No reset request found for this email");
  }

  const record = rows[0];

  if (String(record.otp) !== String(otp)) {
    throw new Error("Invalid OTP");
  }

  if (new Date() > new Date(record.expires_at)) {
    throw new Error("OTP expired");
  }

  return record;
};

export const verifyResetOtpService = async (
  email: string,
  otp: string,
  meta: RequestMeta = {}
) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required");
  }

  try {
    const record = await findActiveResetOtp(email, otp);

    await pool.query(
      `UPDATE email_otps SET verified = 1 WHERE id = ?`,
      [record.id]
    );

    await writeAuditLog({
      actorId: null,
      actorRole: null,
      action: "PASSWORD_RESET_VERIFIED",
      resourceType: "user",
      resourceId: null,
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: true,
      reason: null
    });

    return { verified: true };
  } catch (error) {
    await writeAuditLog({
      actorId: null,
      actorRole: null,
      action: "PASSWORD_RESET_VERIFIED",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: false,
      reason: (error as Error).message
    });
    throw error;
  }
};

export const resetPasswordService = async (
  email: string,
  otp: string,
  newPassword: string,
  confirmPassword: string,
  meta: RequestMeta = {}
) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required");
  }

  if (
    typeof newPassword !== "string" ||
    newPassword.length < PASSWORD_MIN_LENGTH
  ) {
    throw new Error(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    );
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  let record: RowDataPacket;

  try {
    record = await findActiveResetOtp(email, otp);
  } catch (error) {
    await writeAuditLog({
      actorId: null,
      actorRole: null,
      action: "PASSWORD_RESET_COMPLETED",
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: false,
      reason: (error as Error).message
    });
    throw error;
  }

  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT id, role FROM users WHERE email = ?`,
    [email]
  );

  if (users.length === 0) {
    throw new Error("User not found");
  }

  const user = users[0];

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    `UPDATE users SET password_hash = ? WHERE id = ?`,
    [hashedPassword, user.id]
  );

  /* Invalidate active refresh tokens — force re-login */
  await pool.query(
    `DELETE FROM refresh_tokens WHERE user_id = ?`,
    [user.id]
  );

  /* Consume the OTP */
  await pool.query(
    `DELETE FROM email_otps WHERE id = ?`,
    [record.id]
  );

  await writeAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: "PASSWORD_RESET_COMPLETED",
    resourceType: "user",
    resourceId: user.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    success: true,
    reason: null
  });

  return { success: true };
};

/* ----------------------------------------------------------------
   PHARMACY REGISTRATION (Sprint 6)
   No OTP — pharmacy is internal staff. Auto-approved.
-----------------------------------------------------------------*/
export const registerPharmacyService = async (
  data: RegisterPharmacyInput,
  meta: RequestMeta = {}
) => {
  const { email, password, name } = data || {};

  if (!email || !password) {
    throw new Error("Email and password are required");
  }
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE email = ?`,
    [email]
  );
  if (existing.length > 0) {
    throw new Error("Email already registered");
  }

  const userId = `U${Date.now()}`;
  const hashed = await bcrypt.hash(password, 10);

  await pool.query(
    `
    INSERT INTO users
      (id, email, password_hash, role, approval_status, is_active)
    VALUES
      (?, ?, ?, 'PHARMACY', 'APPROVED', 1)
    `,
    [userId, email, hashed]
  );

  await writeAuditLog({
    actorId: userId,
    actorRole: "PHARMACY",
    action: "PHARMACY_REGISTERED",
    resourceType: "user",
    resourceId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    success: true,
    reason: name ? `name=${name}` : null
  });

  return {
    userId,
    email,
    role: "PHARMACY"
  };
};

/* ----------------------------------------------------------------
   ACCOUNT SECURITY — change password + email-based 2FA (all roles)
-----------------------------------------------------------------*/

export const changePasswordService = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
  meta: RequestMeta = {}
) => {
  if (!currentPassword || !newPassword) {
    throw new Error("Current and new password are required");
  }
  if (
    typeof newPassword !== "string" ||
    newPassword.length < PASSWORD_MIN_LENGTH
  ) {
    throw new Error(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    );
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, role, password_hash FROM users WHERE id = ?`,
    [userId]
  );
  if (rows.length === 0) {
    throw new Error("User not found");
  }
  const user = rows[0];

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    throw new Error("Current password is incorrect");
  }

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from the current one");
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [
    hashed,
    userId
  ]);

  /* Force other sessions to re-authenticate. */
  await pool.query(`DELETE FROM refresh_tokens WHERE user_id = ?`, [userId]);

  await writeAuditLog({
    actorId: userId,
    actorRole: user.role,
    action: "PASSWORD_CHANGED",
    resourceType: "user",
    resourceId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    success: true,
    reason: null
  });

  return { success: true };
};

export const getTwoFactorStatusService = async (userId: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT two_factor_enabled, email FROM users WHERE id = ?`,
    [userId]
  );
  if (rows.length === 0) {
    throw new Error("User not found");
  }
  return {
    enabled: rows[0].two_factor_enabled === 1,
    email: rows[0].email
  };
};

/* Send a verification code to the logged-in user so they can either
   enable or disable two-factor authentication. */
export const sendTwoFactorCodeService = async (
  userId: string,
  purpose: "ENABLE" | "DISABLE"
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, email, two_factor_enabled FROM users WHERE id = ?`,
    [userId]
  );
  if (rows.length === 0) {
    throw new Error("User not found");
  }
  const user = rows[0];

  if (purpose === "ENABLE" && user.two_factor_enabled === 1) {
    throw new Error("Two-factor authentication is already enabled");
  }
  if (purpose === "DISABLE" && user.two_factor_enabled === 0) {
    throw new Error("Two-factor authentication is not enabled");
  }

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `DELETE FROM two_factor_codes WHERE user_id = ? AND purpose = ?`,
    [userId, purpose]
  );
  await pool.query(
    `
    INSERT INTO two_factor_codes (id, user_id, code, purpose, expires_at)
    VALUES (?, ?, ?, ?, ?)
    `,
    [uuid(), userId, code, purpose, expiresAt]
  );

  await sendTwoFactorCodeEmail(user.email, code);

  return { delivered: true, email: user.email };
};

export const setTwoFactorService = async (
  userId: string,
  code: string,
  enable: boolean,
  meta: RequestMeta = {}
) => {
  if (!code) {
    throw new Error("Verification code is required");
  }

  const purpose = enable ? "ENABLE" : "DISABLE";

  const [codes] = await pool.query<RowDataPacket[]>(
    `
    SELECT * FROM two_factor_codes
    WHERE user_id = ? AND purpose = ?
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId, purpose]
  );

  if (codes.length === 0) {
    throw new Error("No verification code found. Please request a new one.");
  }
  const record = codes[0];

  if (String(record.code) !== String(code)) {
    throw new Error("Invalid code");
  }
  if (new Date() > new Date(record.expires_at)) {
    throw new Error("Code expired. Please request a new one.");
  }

  await pool.query(`UPDATE users SET two_factor_enabled = ? WHERE id = ?`, [
    enable ? 1 : 0,
    userId
  ]);

  await pool.query(`DELETE FROM two_factor_codes WHERE id = ?`, [record.id]);

  const [userRows] = await pool.query<RowDataPacket[]>(
    `SELECT role FROM users WHERE id = ?`,
    [userId]
  );

  await writeAuditLog({
    actorId: userId,
    actorRole: userRows.length ? userRows[0].role : null,
    action: enable ? "TWO_FACTOR_ENABLED" : "TWO_FACTOR_DISABLED",
    resourceType: "user",
    resourceId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    success: true,
    reason: null
  });

  return { enabled: enable };
};
