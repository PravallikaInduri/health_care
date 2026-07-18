import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import {
  sendDoctorApprovalEmail,
  sendDoctorRejectEmail,
  sendHospitalApprovalEmail,
  sendHospitalRejectEmail
} from "../utils/mail";
import { writeAuditLog } from "./auditService";
import { ActorContext } from "../utils/auditContext";
import { computeAvailableSlots } from "./appointmentService";

const FACILITY_TYPES = ["HOSPITAL", "CLINIC", "LAB", "PHARMACY"] as const;
type FacilityType = typeof FACILITY_TYPES[number];

const isFacilityType = (value: unknown): value is FacilityType =>
  typeof value === "string" &&
  (FACILITY_TYPES as readonly string[]).includes(value);

interface DepartmentUpdateInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  slug?: string | null;
}

export const getAdminStatsService =
async () => {

  const [pending] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS n
    FROM providers
    WHERE verification_status='PENDING'
    `
  );

  const [approved] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS n
    FROM providers
    WHERE verification_status='APPROVED'
    `
  );

  const [patients] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM patients`
  );

  const [facilities] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM facilities`
  );

  const [byType] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      type,
      COUNT(*) AS n
    FROM facilities
    GROUP BY type
    `
  );

  const breakdown: Record<string, number> = {
    HOSPITAL: 0,
    CLINIC: 0,
    LAB: 0
  };

  for (const row of byType) {
    breakdown[row.type] = row.n;
  }

  /* Sprint 12 — clinical queue counts for the admin / hospital dashboard. */
  const [[{ pending_rx }]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS pending_rx
       FROM prescriptions
      WHERE status = 'ACTIVE'`
  );
  const [[{ pending_refills }]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS pending_refills
       FROM refill_requests
      WHERE status = 'PENDING'`
  );
  const [[{ pending_lab_orders }]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS pending_lab_orders
       FROM lab_orders
      WHERE status = 'ORDERED' OR status IS NULL`
  );

  /* Sprint 6 — usage & revenue analytics for the admin dashboard. */
  const [[appts]] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) AS upcoming,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN scheduled_at >= NOW() - INTERVAL 7 DAY THEN 1 ELSE 0 END) AS last7Days
    FROM appointments
    `
  );

  const [[revenue]] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payments WHERE status = 'SUCCESS'`
  );

  return {
    pendingDoctors: pending[0].n,
    approvedDoctors: approved[0].n,
    totalPatients: patients[0].n,
    facilities: facilities[0].n,
    facilityBreakdown: {
      hospitals: breakdown.HOSPITAL,
      clinics: breakdown.CLINIC,
      labs: breakdown.LAB
    },
    pendingPrescriptions: Number(pending_rx) || 0,
    pendingRefills: Number(pending_refills) || 0,
    pendingLabOrders: Number(pending_lab_orders) || 0,
    appointments: {
      total: Number(appts.total ?? 0),
      upcoming: Number(appts.upcoming ?? 0),
      completed: Number(appts.completed ?? 0),
      cancelled: Number(appts.cancelled ?? 0),
      last7Days: Number(appts.last7Days ?? 0)
    },
    revenue: {
      total: Number(revenue.total ?? 0)
    }
  };
};

export const getPendingDoctorsService =
async () => {

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      p.id,
      p.name,
      p.specialty,
      u.email,
      p.verification_status
    FROM providers p
    JOIN users u
      ON p.user_id = u.id
    WHERE p.verification_status='PENDING'
    `
  );

  return rows;
};

export const getDoctorByIdService =
async (
  providerId:string
)=>{

 const [rows] = await pool.query<RowDataPacket[]>(
 `
 SELECT
 p.*,
 u.email
 FROM providers p
 JOIN users u
 ON p.user_id=u.id
 WHERE p.id=?
 `,
 [providerId]
 );

 if(rows.length===0){
   throw new Error(
     "Doctor not found"
   );
 }

 return rows[0];
};

export const approveDoctorService =
async (
 providerId:string,
 actor?: ActorContext
)=>{

 const [rows] = await pool.query<RowDataPacket[]>(
 `
 SELECT
 p.*,
 u.email,
 u.id AS user_id
 FROM providers p
 JOIN users u
 ON p.user_id=u.id
 WHERE p.id=?
 `,
 [providerId]
 );

 if(rows.length===0){
   throw new Error(
     "Doctor not found"
   );
 }

 const doctor = rows[0];

 await pool.query(
 `
 UPDATE users
 SET approval_status='APPROVED'
 WHERE id=?
 `,
 [doctor.user_id]
 );

 await pool.query(
 `
 UPDATE providers
 SET
 verification_status='APPROVED',
 is_verified=TRUE
 WHERE id=?
 `,
 [providerId]
 );

 await pool.query(
 `
 UPDATE provider_documents
 SET verification_status='APPROVED'
 WHERE provider_id=?
 `,
 [providerId]
 );

 await sendDoctorApprovalEmail(
   doctor.email
 );

 await writeAuditLog({
   actorId: actor?.actorId ?? null,
   actorRole: actor?.actorRole ?? "ADMIN",
   action: "DOCTOR_APPROVED",
   resourceType: "provider",
   resourceId: providerId,
   ip: actor?.ip ?? null,
   userAgent: actor?.userAgent ?? null,
   success: true,
   reason: null
 });

 return {
   message:
   "Doctor approved successfully"
 };

};

export const rejectDoctorService =
async (
 providerId:string,
 reason:string,
 actor?: ActorContext
)=>{

 const [rows] = await pool.query<RowDataPacket[]>(
 `
 SELECT
 p.*,
 u.email,
 u.id AS user_id
 FROM providers p
 JOIN users u
 ON p.user_id=u.id
 WHERE p.id=?
 `,
 [providerId]
 );

 if(rows.length===0){
   throw new Error(
     "Doctor not found"
   );
 }

 const doctor = rows[0];

 await pool.query(
 `
 UPDATE users
 SET approval_status='REJECTED'
 WHERE id=?
 `,
 [doctor.user_id]
 );

 await pool.query(
 `
 UPDATE providers
 SET
 verification_status='REJECTED',
 rejection_reason=?
 WHERE id=?
 `,
 [
   reason,
   providerId
 ]
 );

 await pool.query(
 `
 UPDATE provider_documents
 SET verification_status='REJECTED'
 WHERE provider_id=?
 `,
 [providerId]
 );

 await sendDoctorRejectEmail(
   doctor.email,
   reason
 );

 await writeAuditLog({
   actorId: actor?.actorId ?? null,
   actorRole: actor?.actorRole ?? "ADMIN",
   action: "DOCTOR_REJECTED",
   resourceType: "provider",
   resourceId: providerId,
   ip: actor?.ip ?? null,
   userAgent: actor?.userAgent ?? null,
   success: true,
   reason
 });

 return {
   message:
   "Doctor rejected successfully"
 };

};

export const getDoctorDocumentService =
async(
 providerId:string
)=>{

 const [rows] = await pool.query<RowDataPacket[]>(
 `
 SELECT *
 FROM provider_documents
 WHERE provider_id=?
 `,
 [providerId]
 );

 if(rows.length===0){
   throw new Error(
     "Document not found"
   );
 }

 return rows[0];
};


/* ----------------------------------------------------------------
   SPRINT 9 — Hospital registration verification
-----------------------------------------------------------------*/

export const getPendingHospitalsService = async () => {

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      f.id,
      f.name,
      f.city,
      f.address,
      f.phone,
      f.has_lab,
      f.has_pharmacy,
      f.approval_status,
      u.email
    FROM facilities f
    JOIN users u ON u.id = f.owner_user_id
    WHERE f.type = 'HOSPITAL'
      AND f.approval_status = 'PENDING'
    ORDER BY f.id DESC
    `
  );

  return rows;
};

export const approveHospitalService = async (
  facilityId: string,
  actor?: ActorContext
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT f.*, u.email, u.id AS user_id
    FROM facilities f
    JOIN users u ON u.id = f.owner_user_id
    WHERE f.id = ? AND f.type = 'HOSPITAL'
    `,
    [facilityId]
  );

  if (rows.length === 0) {
    throw new Error("Hospital not found");
  }

  const hospital = rows[0];

  await pool.query(
    `UPDATE users SET approval_status='APPROVED' WHERE id=?`,
    [hospital.user_id]
  );

  await pool.query(
    `UPDATE facilities SET approval_status='APPROVED', rejection_reason=NULL WHERE id=?`,
    [facilityId]
  );

  await pool.query(
    `UPDATE facility_documents SET verification_status='APPROVED' WHERE facility_id=?`,
    [facilityId]
  );

  await sendHospitalApprovalEmail(hospital.email, hospital.name);

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "HOSPITAL_APPROVED",
    resourceType: "facility",
    resourceId: facilityId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null
  });

  return { message: "Hospital approved successfully" };
};

export const rejectHospitalService = async (
  facilityId: string,
  reason: string,
  actor?: ActorContext
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT f.*, u.email, u.id AS user_id
    FROM facilities f
    JOIN users u ON u.id = f.owner_user_id
    WHERE f.id = ? AND f.type = 'HOSPITAL'
    `,
    [facilityId]
  );

  if (rows.length === 0) {
    throw new Error("Hospital not found");
  }

  const hospital = rows[0];

  await pool.query(
    `UPDATE users SET approval_status='REJECTED' WHERE id=?`,
    [hospital.user_id]
  );

  await pool.query(
    `UPDATE facilities SET approval_status='REJECTED', rejection_reason=? WHERE id=?`,
    [reason, facilityId]
  );

  await pool.query(
    `UPDATE facility_documents SET verification_status='REJECTED' WHERE facility_id=?`,
    [facilityId]
  );

  await sendHospitalRejectEmail(hospital.email, hospital.name, reason);

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "HOSPITAL_REJECTED",
    resourceType: "facility",
    resourceId: facilityId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason
  });

  return { message: "Hospital rejected successfully" };
};

export const getHospitalDocumentService = async (
  facilityId: string
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM facility_documents
    WHERE facility_id = ?
    ORDER BY uploaded_at DESC
    LIMIT 1
    `,
    [facilityId]
  );

  if (rows.length === 0) {
    throw new Error("Document not found");
  }

  return rows[0];
};


/* ----------------------------------------------------------------
   SPRINT 2 — Admin directory & detail views
-----------------------------------------------------------------*/

export interface ListDoctorsFilters {
  search?: string;
  status?: string;
  specialty?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
}

/*
NOTE: providers table has no created_at column. The newest providers are
identified by their underlying users.created_at, so we sort/select on that.
*/
const DOCTOR_SORT_COLUMNS: Record<string, string> = {
  name: "p.name",
  specialty: "p.specialty",
  status: "p.verification_status",
  created_at: "u.created_at",
  email: "u.email"
};

const PATIENT_SORT_COLUMNS: Record<string, string> = {
  name: "p.first_name",
  mrn: "p.mrn",
  dob: "p.dob",
  created_at: "p.created_at"
};

const clampPagination = (
  page?: number,
  limit?: number
) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(
    100,
    Math.max(1, Number(limit) || 20)
  );
  return {
    page: p,
    limit: l,
    offset: (p - 1) * l
  };
};

const resolveSort = (
  allowed: Record<string, string>,
  sortBy?: string,
  sortDir?: string,
  fallback: string = "created_at"
): { column: string; direction: "ASC" | "DESC" } => {
  const column = allowed[sortBy ?? fallback]
    ?? allowed[fallback];

  const direction =
    (sortDir ?? "DESC").toUpperCase() === "ASC"
      ? "ASC"
      : "DESC";

  return { column, direction };
};

export const listDoctorsService = async (
  filters: ListDoctorsFilters,
  actor?: ActorContext
) => {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push(
      "(p.name LIKE ? OR u.email LIKE ? OR p.specialty LIKE ?)"
    );
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  if (filters.status) {
    where.push("p.verification_status = ?");
    params.push(filters.status);
  }

  if (filters.specialty) {
    where.push("p.specialty = ?");
    params.push(filters.specialty);
  }

  const whereSql = where.length
    ? `WHERE ${where.join(" AND ")}`
    : "";

  const { page, limit, offset } =
    clampPagination(filters.page, filters.limit);

  const { column: sortCol, direction: sortDir } =
    resolveSort(
      DOCTOR_SORT_COLUMNS,
      filters.sortBy,
      filters.sortDir,
      "created_at"
    );

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      p.id,
      p.name,
      p.specialty,
      p.verification_status,
      p.is_verified,
      p.accepting_new,
      p.photo_url,
      p.npi_or_mci,
      u.created_at AS created_at,
      u.email,
      u.approval_status
    FROM providers p
    JOIN users u
      ON p.user_id = u.id
    ${whereSql}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM providers p
    JOIN users u
      ON p.user_id = u.id
    ${whereSql}
    `,
    params
  );

  const total = countRows[0].total;

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "ADMIN_VIEW_DOCTORS_LIST",
    resourceType: "provider",
    resourceId: null,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: filters.search
      ? `search=${filters.search}`
      : null
  });

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / Math.max(1, limit))
    }
  };
};

export interface ListPatientsFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
}

export const listPatientsService = async (
  filters: ListPatientsFilters,
  actor?: ActorContext
) => {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push(
      `(
        p.mrn LIKE ?
        OR p.phone LIKE ?
        OR p.first_name LIKE ?
        OR p.last_name LIKE ?
        OR CONCAT(p.first_name, ' ', p.last_name) LIKE ?
      )`
    );
    const term = `%${filters.search}%`;
    params.push(term, term, term, term, term);
  }

  const whereSql = where.length
    ? `WHERE ${where.join(" AND ")}`
    : "";

  const { page, limit, offset } =
    clampPagination(filters.page, filters.limit);

  const { column: sortCol, direction: sortDir } =
    resolveSort(
      PATIENT_SORT_COLUMNS,
      filters.sortBy,
      filters.sortDir,
      "created_at"
    );

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      p.id,
      p.mrn,
      p.first_name,
      p.last_name,
      p.dob,
      p.sex,
      p.phone,
      p.email,
      p.photo_url,
      p.created_at
    FROM patients p
    ${whereSql}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM patients p
    ${whereSql}
    `,
    params
  );

  const total = countRows[0].total;

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "ADMIN_VIEW_PATIENTS_LIST",
    resourceType: "patient",
    resourceId: null,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: filters.search
      ? `search=${filters.search}`
      : null
  });

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / Math.max(1, limit))
    }
  };
};

export const getPatientFullProfileService = async (
  patientId: string,
  actor?: ActorContext
) => {
  const [patientRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      p.*,
      u.email AS account_email,
      u.is_active,
      u.created_at AS account_created_at
    FROM patients p
    LEFT JOIN users u
      ON p.user_id = u.id
    WHERE p.id = ?
    `,
    [patientId]
  );

  if (patientRows.length === 0) {
    throw new Error("Patient not found");
  }

  const profile = patientRows[0];

  const [appointments] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      a.id,
      a.scheduled_at,
      a.duration_min,
      a.type,
      a.status,
      a.reason,
      a.appointment_mode,
      a.meeting_link,
      a.provider_id,
      a.facility_id,
      prov.name AS provider_name,
      prov.specialty AS provider_specialty,
      f.name AS facility_name
    FROM appointments a
    LEFT JOIN providers prov
      ON a.provider_id = prov.id
    LEFT JOIN facilities f
      ON a.facility_id = f.id
    WHERE a.patient_id = ?
    ORDER BY a.scheduled_at DESC
    `,
    [patientId]
  );

  const [insurance] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM insurance
    WHERE patient_id = ?
    ORDER BY valid_from DESC
    `,
    [patientId]
  );

  const [dependents] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM patient_dependents
    WHERE patient_id = ?
    `,
    [patientId]
  );

  /*
  Existing patientService reads from `patient_emergency_contacts`,
  but `addEmergencyContact` writes to `emergency_contacts`. We try the
  canonical read table first and silently fall back so admin views work
  in either schema variant.
  */
  let emergencyContacts: unknown[] = [];
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT *
      FROM patient_emergency_contacts
      WHERE patient_id = ?
      `,
      [patientId]
    );
    emergencyContacts = rows;
  } catch {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `
        SELECT *
        FROM emergency_contacts
        WHERE patient_id = ?
        `,
        [patientId]
      );
      emergencyContacts = rows;
    } catch {
      emergencyContacts = [];
    }
  }

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "ADMIN_VIEW_PATIENT",
    resourceType: "patient",
    resourceId: patientId,
    patientId: patientId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null
  });

  return {
    profile,
    appointments,
    insurance,
    dependents,
    emergencyContacts
  };
};

export const getDoctorScheduleService = async (
  providerId: string,
  actor?: ActorContext
) => {
  const [providerRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      p.id,
      p.name,
      p.specialty,
      p.verification_status,
      p.accepting_new,
      u.email
    FROM providers p
    JOIN users u
      ON p.user_id = u.id
    WHERE p.id = ?
    `,
    [providerId]
  );

  if (providerRows.length === 0) {
    throw new Error("Doctor not found");
  }

  const provider = providerRows[0];

  const [templates] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM provider_schedule_templates
    WHERE provider_id = ?
    ORDER BY created_at DESC
    `,
    [providerId]
  );

  const templateIds = templates.map(
    (t: RowDataPacket) => t.id
  );

  let blocks: RowDataPacket[] = [];
  if (templateIds.length > 0) {
    const placeholders = templateIds
      .map(() => "?")
      .join(",");
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT *
      FROM provider_schedule_blocks
      WHERE template_id IN (${placeholders})
      ORDER BY weekday, start_time
      `,
      templateIds
    );
    blocks = rows;
  }

  /* Attach blocks to their template */
  const templatesWithBlocks = templates.map(
    (t: RowDataPacket) => ({
      ...t,
      blocks: blocks.filter(
        (b: RowDataPacket) => b.template_id === t.id
      )
    })
  );

  const [overrides] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM provider_schedule_overrides
    WHERE provider_id = ?
    ORDER BY start_datetime DESC
    `,
    [providerId]
  );

  /* Availability summary — next 7 days */
  const summary: Array<{
    date: string;
    weekday: number;
    slotsCount: number;
  }> = [];

  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, "0");
    const d = String(day.getDate()).padStart(2, "0");
    const isoDate = `${y}-${m}-${d}`;

    try {
      const { slots } = await computeAvailableSlots(
        providerId,
        isoDate
      );
      summary.push({
        date: isoDate,
        weekday: day.getDay(),
        slotsCount: slots.length
      });
    } catch {
      summary.push({
        date: isoDate,
        weekday: day.getDay(),
        slotsCount: 0
      });
    }
  }

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "ADMIN_VIEW_DOCTOR_SCHEDULE",
    resourceType: "provider",
    resourceId: providerId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null
  });

  return {
    provider,
    templates: templatesWithBlocks,
    overrides,
    availabilitySummary: summary
  };
};


/* ----------------------------------------------------------------
   SPRINT 3 — Facility management
-----------------------------------------------------------------*/

export interface ListFacilitiesFilters {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
}

const FACILITY_SORT_COLUMNS: Record<string, string> = {
  name: "f.name",
  type: "f.type"
};

export const listFacilitiesService = async (
  filters: ListFacilitiesFilters,
  actor?: ActorContext
) => {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push("f.name LIKE ?");
    params.push(`%${filters.search}%`);
  }

  if (filters.type) {
    if (!isFacilityType(filters.type)) {
      throw new Error("Invalid facility type filter");
    }
    where.push("f.type = ?");
    params.push(filters.type);
  }

  const whereSql = where.length
    ? `WHERE ${where.join(" AND ")}`
    : "";

  const { page, limit, offset } = clampPagination(
    filters.page,
    filters.limit
  );

  const { column: sortCol, direction: sortDir } = resolveSort(
    FACILITY_SORT_COLUMNS,
    filters.sortBy,
    filters.sortDir,
    "name"
  );

  /*
  Override default direction for "name" — admins expect alphabetical asc
  unless they explicitly ask for desc.
  */
  const effectiveDir =
    filters.sortDir
      ? sortDir
      : filters.sortBy === "name" || !filters.sortBy
        ? "ASC"
        : sortDir;

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      f.id,
      f.name,
      f.type,
      f.address,
      f.phone,
      f.logo_url,
      (
        SELECT COUNT(*)
        FROM provider_facilities pf
        WHERE pf.facility_id = f.id
      ) AS provider_count
    FROM facilities f
    ${whereSql}
    ORDER BY ${sortCol} ${effectiveDir}
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM facilities f
    ${whereSql}
    `,
    params
  );

  const total = countRows[0].total;

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "ADMIN_VIEW_FACILITIES_LIST",
    resourceType: "facility",
    resourceId: null,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: filters.search
      ? `search=${filters.search}`
      : null
  });

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / Math.max(1, limit))
    }
  };
};

export const getFacilityByIdService = async (
  facilityId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      f.id,
      f.name,
      f.type,
      f.address,
      f.phone,
      f.logo_url
    FROM facilities f
    WHERE f.id = ?
    `,
    [facilityId]
  );

  if (rows.length === 0) {
    throw new Error("Facility not found");
  }

  return rows[0];
};

export const getFacilityWithProvidersService = async (
  facilityId: string,
  actor?: ActorContext
) => {
  const facility = await getFacilityByIdService(facilityId);

  const [providers] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      p.id,
      p.name,
      p.specialty,
      p.verification_status,
      p.is_verified,
      p.accepting_new,
      p.photo_url,
      u.email
    FROM provider_facilities pf
    JOIN providers p
      ON pf.provider_id = p.id
    JOIN users u
      ON p.user_id = u.id
    WHERE pf.facility_id = ?
    ORDER BY p.name
    `,
    [facilityId]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "ADMIN_VIEW_FACILITY",
    resourceType: "facility",
    resourceId: facilityId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null
  });

  return {
    facility,
    providers
  };
};

/*
List APPROVED, ACTIVE providers that are NOT yet assigned to this facility.
Used by the admin "Assign Provider" picker on the Facility Detail page.
*/
export const getAssignableProvidersForFacilityService = async (
  facilityId: string
) => {
  await getFacilityByIdService(facilityId);

  const [providers] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      p.id,
      p.name,
      p.specialty,
      p.photo_url,
      u.email
    FROM providers p
    JOIN users u
      ON p.user_id = u.id
    WHERE u.approval_status = 'APPROVED'
      AND u.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM provider_facilities pf
        WHERE pf.provider_id = p.id
          AND pf.facility_id = ?
      )
    ORDER BY p.name
    `,
    [facilityId]
  );

  return { providers };
};

export interface FacilityInput {
  name?: string;
  type?: string;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
}

const validateFacilityInput = (
  data: FacilityInput,
  { partial = false }: { partial?: boolean } = {}
): {
  name?: string;
  type?: FacilityType;
  address: string | null;
  phone: string | null;
  logo_url: string | null | undefined;
} => {
  if (!partial || data.name !== undefined) {
    if (
      typeof data.name !== "string" ||
      data.name.trim().length === 0
    ) {
      throw new Error("Facility name is required");
    }
    if (data.name.trim().length > 255) {
      throw new Error("Facility name must be 255 characters or fewer");
    }
  }

  if (!partial || data.type !== undefined) {
    if (!isFacilityType(data.type)) {
      throw new Error(
        "Facility type must be one of HOSPITAL, CLINIC, LAB"
      );
    }
  }

  if (
    data.phone !== undefined &&
    data.phone !== null &&
    typeof data.phone === "string" &&
    data.phone.length > 20
  ) {
    throw new Error("Phone must be 20 characters or fewer");
  }

  /* Logo: accept either a base64 data URL (as produced by
     fileToThumbnailDataUrl) or a regular http(s) URL. Reject anything
     suspicious to avoid abuse of the column. */
  if (
    data.logo_url !== undefined &&
    data.logo_url !== null &&
    typeof data.logo_url === "string" &&
    data.logo_url.trim().length > 0
  ) {
    const url = data.logo_url.trim();
    const isData = url.startsWith("data:image/");
    const isHttp = /^https?:\/\//i.test(url);
    if (!isData && !isHttp) {
      throw new Error("Logo must be an image URL or uploaded file");
    }
    /* Hard cap to keep the row reasonable (~700 KB raw).  The frontend
       resizes to 256x256 so legitimate uploads are <50 KB. */
    if (url.length > 1_000_000) {
      throw new Error("Logo image is too large — please use a smaller image");
    }
  }

  return {
    name:
      data.name === undefined
        ? undefined
        : (data.name as string).trim(),
    type:
      data.type === undefined
        ? undefined
        : (data.type as FacilityType),
    address:
      data.address === undefined
        ? null
        : data.address === null
          ? null
          : String(data.address).trim() || null,
    phone:
      data.phone === undefined
        ? null
        : data.phone === null
          ? null
          : String(data.phone).trim() || null,
    logo_url:
      /* undefined  → leave column unchanged (partial update)
         null/""    → clear the logo
         string     → set the logo */
      data.logo_url === undefined
        ? undefined
        : data.logo_url === null
          ? null
          : String(data.logo_url).trim() || null
  };
};

export const createFacilityService = async (
  data: FacilityInput,
  actor?: ActorContext
) => {
  const clean = validateFacilityInput(data);

  const id = uuid();

  await pool.query(
    `
    INSERT INTO facilities
    (id, name, type, address, phone, logo_url)
    VALUES
    (?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      clean.name,
      clean.type,
      clean.address,
      clean.phone,
      /* For inserts treat undefined as NULL; partial-update sentinel
         only matters on UPDATE. */
      clean.logo_url ?? null
    ]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "FACILITY_CREATED",
    resourceType: "facility",
    resourceId: id,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null
  });

  return {
    id,
    name: clean.name,
    type: clean.type,
    address: clean.address,
    phone: clean.phone
  };
};

export const updateFacilityService = async (
  facilityId: string,
  data: FacilityInput,
  actor?: ActorContext
) => {
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM facilities WHERE id = ?`,
    [facilityId]
  );

  if (existing.length === 0) {
    throw new Error("Facility not found");
  }

  const clean = validateFacilityInput(data, { partial: true });

  const sets: string[] = [];
  const params: unknown[] = [];

  if (clean.name !== undefined) {
    sets.push("name = ?");
    params.push(clean.name);
  }
  if (clean.type !== undefined) {
    sets.push("type = ?");
    params.push(clean.type);
  }
  if (data.address !== undefined) {
    sets.push("address = ?");
    params.push(clean.address);
  }
  if (data.phone !== undefined) {
    sets.push("phone = ?");
    params.push(clean.phone);
  }
  if (clean.logo_url !== undefined) {
    sets.push("logo_url = ?");
    params.push(clean.logo_url);
  }

  if (sets.length === 0) {
    throw new Error("No fields to update");
  }

  params.push(facilityId);

  await pool.query(
    `UPDATE facilities SET ${sets.join(", ")} WHERE id = ?`,
    params
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "FACILITY_UPDATED",
    resourceType: "facility",
    resourceId: facilityId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null
  });

  return getFacilityByIdService(facilityId);
};

export const deleteFacilityService = async (
  facilityId: string,
  actor?: ActorContext
) => {
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM facilities WHERE id = ?`,
    [facilityId]
  );

  if (existing.length === 0) {
    throw new Error("Facility not found");
  }

  /*
  Block deletion if the facility is referenced by non-cancelled
  appointment — keeping historical/active appointments consistent.
  Provider assignments are cleared automatically.
  */
  const [appts] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS n
    FROM appointments
    WHERE facility_id = ?
      AND status != 'CANCELLED'
    `,
    [facilityId]
  );

  if (appts[0].n > 0) {
    throw new Error(
      "Cannot delete facility — it has active appointments"
    );
  }

  await pool.query(
    `DELETE FROM provider_facilities WHERE facility_id = ?`,
    [facilityId]
  );

  await pool.query(
    `DELETE FROM facilities WHERE id = ?`,
    [facilityId]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "FACILITY_DELETED",
    resourceType: "facility",
    resourceId: facilityId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null
  });

  return { success: true };
};

export const listProviderFacilitiesAdminService = async (
  providerId: string
) => {
  const [providerRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM providers WHERE id = ?`,
    [providerId]
  );

  if (providerRows.length === 0) {
    throw new Error("Doctor not found");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      f.id,
      f.name,
      f.type,
      f.address,
      f.phone
    FROM provider_facilities pf
    JOIN facilities f
      ON pf.facility_id = f.id
    WHERE pf.provider_id = ?
    ORDER BY f.name
    `,
    [providerId]
  );

  return rows;
};

export const assignFacilityToProviderService = async (
  providerId: string,
  facilityId: string,
  actor?: ActorContext
) => {
  if (!facilityId || typeof facilityId !== "string") {
    throw new Error("facility_id is required");
  }

  const [providerRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM providers WHERE id = ?`,
    [providerId]
  );

  if (providerRows.length === 0) {
    throw new Error("Doctor not found");
  }

  const [facilityRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM facilities WHERE id = ?`,
    [facilityId]
  );

  if (facilityRows.length === 0) {
    throw new Error("Facility not found");
  }

  const [existing] = await pool.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM provider_facilities
    WHERE provider_id = ? AND facility_id = ?
    `,
    [providerId, facilityId]
  );

  if (existing.length > 0) {
    throw new Error(
      "Facility is already assigned to this doctor"
    );
  }

  await pool.query(
    `
    INSERT INTO provider_facilities
    (provider_id, facility_id)
    VALUES (?, ?)
    `,
    [providerId, facilityId]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "FACILITY_ASSIGNED",
    resourceType: "provider",
    resourceId: providerId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `facility=${facilityId}`
  });

  return { success: true };
};

export const removeFacilityFromProviderService = async (
  providerId: string,
  facilityId: string,
  actor?: ActorContext
) => {
  const [result] = await pool.query<ResultSetHeader>(
    `
    DELETE FROM provider_facilities
    WHERE provider_id = ? AND facility_id = ?
    `,
    [providerId, facilityId]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "This facility is not assigned to that doctor"
    );
  }

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "FACILITY_UNASSIGNED",
    resourceType: "provider",
    resourceId: providerId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `facility=${facilityId}`
  });

  return { success: true };
};

/* ================================================================
   DEPARTMENT CRUD (Sprint 7)
=================================================================*/

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const listDepartmentsService = async (search?: string) => {
  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    where.push("(d.name LIKE ? OR d.description LIKE ?)");
    const t = `%${search}%`;
    params.push(t, t);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      d.id,
      d.name,
      d.description,
      d.icon,
      d.slug,
      (
        SELECT COUNT(*) FROM facility_departments fd
         WHERE fd.department_id = d.id
      ) AS facility_count,
      (
        SELECT COUNT(*) FROM provider_departments pd
         WHERE pd.department_id = d.id
      ) AS provider_count
    FROM departments d
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY d.name ASC
    `,
    params
  );
  return rows;
};

export const getDepartmentByIdAdminService = async (id: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM departments WHERE id = ? LIMIT 1`,
    [id]
  );
  if (rows.length === 0) throw new Error("Department not found");
  return rows[0];
};

export const createDepartmentService = async (
  data: Record<string, never>,
  actor?: ActorContext
) => {
  const name = String(data?.name || "").trim();
  if (!name) throw new Error("Department name is required");

  const slug = data?.slug
    ? slugify(String(data.slug))
    : slugify(name);

  const [dup] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM departments WHERE slug = ? LIMIT 1`,
    [slug]
  );
  if (dup.length > 0) {
    throw new Error("A department with that slug already exists");
  }

  const id = uuid();
  await pool.query(
    `INSERT INTO departments (id, name, description, icon, slug)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      name,
      data?.description ?? null,
      data?.icon ?? null,
      slug,
    ]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "DEPARTMENT_CREATED",
    resourceType: "department",
    resourceId: id,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `name=${name}`,
  });

  return { id, name, slug };
};

export const updateDepartmentService = async (
  id: string,
  data: DepartmentUpdateInput,
  actor?: ActorContext
) => {
  const [exist] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM departments WHERE id = ? LIMIT 1`,
    [id]
  );
  if (exist.length === 0) {
    throw new Error("Department not found");
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (typeof data?.name === "string") {
    const trimmed = data.name.trim();
    if (!trimmed) throw new Error("Name cannot be empty");
    fields.push("name = ?");
    values.push(trimmed);
  }
  if (typeof data?.description === "string" || data?.description === null) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (typeof data?.icon === "string" || data?.icon === null) {
    fields.push("icon = ?");
    values.push(data.icon);
  }
  if (typeof data?.slug === "string") {
    const newSlug = slugify(data.slug);
    if (!newSlug) throw new Error("Slug cannot be empty");
    if (newSlug !== exist[0].slug) {
      const [dup] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM departments WHERE slug = ? AND id <> ? LIMIT 1`,
        [newSlug, id]
      );
      if (dup.length > 0) {
        throw new Error(
          "A different department already uses that slug"
        );
      }
    }
    fields.push("slug = ?");
    values.push(newSlug);
  }

  if (fields.length === 0) {
    return { success: true, unchanged: true };
  }

  values.push(id);
  await pool.query(
    `UPDATE departments SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "DEPARTMENT_UPDATED",
    resourceType: "department",
    resourceId: id,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null,
  });

  return { success: true };
};

export const deleteDepartmentService = async (
  id: string,
  actor?: ActorContext
) => {
  const [exist] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM departments WHERE id = ? LIMIT 1`,
    [id]
  );
  if (exist.length === 0) {
    throw new Error("Department not found");
  }

  /* cascade-clean junctions to keep things tidy */
  await pool.query(
    `DELETE FROM facility_departments WHERE department_id = ?`,
    [id]
  );
  await pool.query(
    `DELETE FROM provider_departments WHERE department_id = ?`,
    [id]
  );
  await pool.query(`DELETE FROM departments WHERE id = ?`, [id]);

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "DEPARTMENT_DELETED",
    resourceType: "department",
    resourceId: id,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null,
  });

  return { success: true };
};

/* ================================================================
   FACILITY ↔ DEPARTMENT
=================================================================*/

/**
 * Reverse of listFacilityDepartmentsAdminService: list the facilities a given
 * department is attached to. Restricted to HOSPITAL facilities so the admin
 * Departments page can render a "Available at hospitals" checklist.
 */
export const listDepartmentFacilitiesAdminService = async (
  departmentId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT f.id, f.name, f.type, f.address
      FROM facility_departments fd
      JOIN facilities f ON f.id = fd.facility_id
     WHERE fd.department_id = ?
       AND f.type = 'HOSPITAL'
     ORDER BY f.name
    `,
    [departmentId]
  );
  return rows;
};

export const listFacilityDepartmentsAdminService = async (
  facilityId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT d.id, d.name, d.icon, d.slug, d.description
      FROM facility_departments fd
      JOIN departments d ON d.id = fd.department_id
     WHERE fd.facility_id = ?
     ORDER BY d.name
    `,
    [facilityId]
  );
  return rows;
};

export const attachDepartmentToFacilityService = async (
  facilityId: string,
  departmentId: string,
  actor?: ActorContext
) => {
  const [[fac]] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM facilities WHERE id = ? LIMIT 1`,
    [facilityId]
  );
  if (!fac) throw new Error("Facility not found");

  const [[dep]] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM departments WHERE id = ? LIMIT 1`,
    [departmentId]
  );
  if (!dep) throw new Error("Department not found");

  await pool.query(
    `INSERT IGNORE INTO facility_departments
       (facility_id, department_id) VALUES (?, ?)`,
    [facilityId, departmentId]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "FACILITY_DEPARTMENT_ATTACHED",
    resourceType: "facility",
    resourceId: facilityId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `department=${departmentId}`,
  });

  return { success: true };
};

export const detachDepartmentFromFacilityService = async (
  facilityId: string,
  departmentId: string,
  actor?: ActorContext
) => {
  const [r] = await pool.query<ResultSetHeader>(
    `DELETE FROM facility_departments
      WHERE facility_id = ? AND department_id = ?`,
    [facilityId, departmentId]
  );
  if (r.affectedRows === 0) {
    throw new Error(
      "This department is not attached to that facility"
    );
  }

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "FACILITY_DEPARTMENT_DETACHED",
    resourceType: "facility",
    resourceId: facilityId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `department=${departmentId}`,
  });

  return { success: true };
};

/* ================================================================
   PROVIDER ↔ DEPARTMENT
=================================================================*/

export const listProviderDepartmentsAdminService = async (
  providerId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT d.id, d.name, d.icon, d.slug, d.description
      FROM provider_departments pd
      JOIN departments d ON d.id = pd.department_id
     WHERE pd.provider_id = ?
     ORDER BY d.name
    `,
    [providerId]
  );
  return rows;
};

export const attachDepartmentToProviderService = async (
  providerId: string,
  departmentId: string,
  actor?: ActorContext
) => {
  const [[prov]] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM providers WHERE id = ? LIMIT 1`,
    [providerId]
  );
  if (!prov) throw new Error("Provider not found");

  const [[dep]] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM departments WHERE id = ? LIMIT 1`,
    [departmentId]
  );
  if (!dep) throw new Error("Department not found");

  await pool.query(
    `INSERT IGNORE INTO provider_departments
       (provider_id, department_id) VALUES (?, ?)`,
    [providerId, departmentId]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "PROVIDER_DEPARTMENT_ATTACHED",
    resourceType: "provider",
    resourceId: providerId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `department=${departmentId}`,
  });

  return { success: true };
};

export const detachDepartmentFromProviderService = async (
  providerId: string,
  departmentId: string,
  actor?: ActorContext
) => {
  const [r] = await pool.query<ResultSetHeader>(
    `DELETE FROM provider_departments
      WHERE provider_id = ? AND department_id = ?`,
    [providerId, departmentId]
  );
  if (r.affectedRows === 0) {
    throw new Error(
      "This department is not attached to that provider"
    );
  }

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "PROVIDER_DEPARTMENT_DETACHED",
    resourceType: "provider",
    resourceId: providerId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `department=${departmentId}`,
  });

  return { success: true };
};
