import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import {
  sendAppointmentConfirmedEmail,
  sendAppointmentCancelledEmail
} from "../utils/mail";
import { cacheDel } from "../config/redis";
import {
  processUnavailabilityImpact,
  reverseUnavailabilityImpact
} from "./appointmentBookingService";
import { getProviderIdByUser } from "../utils/identity";
import { logger } from "../utils/logger";

interface ScheduleBlockInput {
  weekday: string | number;
  start_time: string;
  end_time: string;
}

interface CreateScheduleInput {
  template_name?: string;
  effective_start_date?: string;
  effective_end_date?: string | null;
  run_indefinitely?: boolean | number;
  appointment_duration?: number;
  buffer_time?: number;
  allow_in_person?: boolean | number;
  allow_video?: boolean | number;
  blocks: ScheduleBlockInput[];
}

const toDateKey = (value: string | Date): string => {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getMyProfileService =
async (
  userId: string
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT *
      FROM providers
      WHERE user_id=?
      `,
      [userId]
    );

  return rows[0];
};

export const updateMyProfileService =
async (
  userId: string,
  data: Record<string, never>
) => {

  const {
    name,
    specialty,
    bio,
    photo_url,
    languages,
    accepting_new
  } = data;

  await pool.query(
    `
    UPDATE providers
    SET
      name=?,
      specialty=?,
      bio=?,
      photo_url=?,
      languages=?,
      accepting_new=?
    WHERE user_id=?
    `,
    [
      name,
      specialty,
      bio,
      photo_url ?? null,
      languages
        ? JSON.stringify(languages)
        : null,
      accepting_new ?? true,
      userId
    ]
  );

  return {
    message:
      "Profile updated successfully"
  };

};

export const updateAppointmentStatusService =
async (
  userId: string,
  appointmentId: string,
  status: string
) => {

  const allowed = [
    "REQUESTED",
    "CONFIRMED",
    "CHECKED_IN",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW"
  ];

  if (!allowed.includes(status)) {
    throw new Error("Invalid status value");
  }

  const [providerRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT id
      FROM providers
      WHERE user_id = ?
      `,
      [userId]
    );

  if (providerRows.length === 0) {
    throw new Error("Provider not found");
  }

  const providerId =
    providerRows[0].id;

  const [result] = await pool.query<ResultSetHeader>(
      `
      UPDATE appointments
      SET status = ?
      WHERE id = ?
      AND provider_id = ?
      `,
      [
        status,
        appointmentId,
        providerId
      ]
    );

  if (result.affectedRows === 0) {
    throw new Error(
      "Appointment not found for this provider"
    );
  }

  /* Notify patient by email on confirmation / cancellation */
  if (
    status === "CONFIRMED" ||
    status === "CANCELLED"
  ) {
    try {

      const [rows] = await pool.query<RowDataPacket[]>(
          `
          SELECT
            a.scheduled_at,
            a.provider_id,
            a.type,
            a.appointment_mode,
            a.meeting_link,
            pat.first_name,
            pat.last_name,
            pat.email,
            prov.name AS doctor_name,
            f.name AS facility_name
          FROM appointments a
          JOIN patients pat
            ON a.patient_id = pat.id
          JOIN providers prov
            ON a.provider_id = prov.id
          LEFT JOIN facilities f
            ON a.facility_id = f.id
          WHERE a.id = ?
          `,
          [appointmentId]
        );

      const info = rows[0];

      /* A cancellation frees the slot — drop cached availability */
      if (status === "CANCELLED" && info) {
        await cacheDel(
          `availability:${info.provider_id}:${toDateKey(
            info.scheduled_at
          )}`
        );
      }

      if (info?.email) {

        const patientName =
          `${info.first_name} ${info.last_name}`.trim();

        if (status === "CONFIRMED") {
          await sendAppointmentConfirmedEmail({
            email: info.email,
            patientName,
            doctorName: info.doctor_name,
            scheduledAt: info.scheduled_at,
            type:
              info.appointment_mode || info.type,
            facilityName: info.facility_name,
            meetingLink: info.meeting_link
          });
        } else {
          await sendAppointmentCancelledEmail({
            email: info.email,
            patientName,
            doctorName: info.doctor_name,
            scheduledAt: info.scheduled_at,
            cancelledBy: "PROVIDER"
          });
        }
      }

    } catch (mailError) {
      logger.error(
        "Failed to send appointment email:",
        mailError
      );
    }
  }

  return {
    success: true,
    message: "Appointment status updated"
  };

};



export const getAppointmentsService =
async (
  userId: string
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        a.*,
        p.first_name,
        p.last_name
      FROM appointments a
      JOIN providers pr
      ON a.provider_id = pr.id
      JOIN patients p
      ON a.patient_id = p.id
      WHERE pr.user_id = ?
      ORDER BY a.scheduled_at
      `,
      [userId]
    );

  return rows;

};


export const createEncounterService =
async (
  data: Record<string, never>
)=>{

 const encounterId = uuid();

 await pool.query(
 `
 INSERT INTO encounters
 (
  id,
  appointment_id,
  provider_id,
  patient_id,
  started_at,
  chief_complaint,
  vitals,
  soap_note,
  billing_codes
 )
 VALUES
 (?, ?, ?, ?, NOW(), ?, ?, ?, ?)
 `,
 [
  encounterId,
  data.appointment_id,
  data.provider_id,
  data.patient_id,
  data.chief_complaint,
  data.vitals
    ? JSON.stringify(data.vitals)
    : null,
  data.soap_note,
  data.billing_codes
    ? JSON.stringify(data.billing_codes)
    : null
 ]
 );

 return {
  message:
  "Encounter created",
  encounterId
 };

};

export const createDiagnosisService =
async(data: RowDataPacket)=>{

 await pool.query(
 `
 INSERT INTO diagnoses
 (
  id,
  encounter_id,
  icd10_code,
  description,
  is_chronic
 )
 VALUES
 (?, ?, ?, ?, ?)
 `,
 [
  uuid(),
  data.encounter_id,
  data.icd10_code,
  data.description,
  data.is_chronic
 ]
 );

 return {
  message:
  "Diagnosis added"
 };

};

/* ------------------------------------------------------------------
   SPRINT 10 — Lab order & prescription routing.
   A clinical order is routed to the LAB / PHARMACY unit owned by the
   hospital where the encounter took place. Routing is computed at
   create time and stored on the row (not re-derived later).
-------------------------------------------------------------------*/
export const resolveEncounterFacilityId = async (
  encounterId: string
): Promise<string | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT a.facility_id
      FROM encounters e
      JOIN appointments a ON a.id = e.appointment_id
     WHERE e.id = ?
     LIMIT 1
    `,
    [encounterId]
  );
  return rows.length ? rows[0].facility_id : null;
};

/**
 * Find the approved LAB / PHARMACY unit owned by the hospital that the
 * given facility belongs to. The facility is either the hospital itself
 * (type HOSPITAL) or one of its child units; in both cases we resolve to
 * the hospital and pick its child unit of the requested type.
 * Returns null when the hospital has no such unit ("unrouted").
 */
export const resolveHospitalUnitId = async (
  facilityId: string | null,
  unitType: "LAB" | "PHARMACY"
): Promise<string | null> => {
  if (!facilityId) return null;
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT child.id
      FROM facilities f
      JOIN facilities child
        ON child.parent_facility_id =
           (CASE WHEN f.type = 'HOSPITAL' THEN f.id ELSE f.parent_facility_id END)
     WHERE f.id = ?
       AND child.type = ?
       AND child.approval_status = 'APPROVED'
     ORDER BY child.name
     LIMIT 1
    `,
    [facilityId, unitType]
  );
  return rows.length ? rows[0].id : null;
};

export const createPrescriptionService =
async(data: RowDataPacket)=>{

 /* Sprint 12: route the prescription to a specific pharmacy facility
    so the pharmacy scoping in /pharmacy/* queries works. We require it
    here because an unrouted prescription would be invisible to every
    pharmacy and silently lost. */
 const pharmacyFacilityId =
   data.pharmacy_facility_id ||
   data.pharmacyFacilityId ||
   null;

 if (!pharmacyFacilityId) {
   throw new Error("pharmacy_facility_id is required");
 }

 const [pharmRows] = await pool.query<RowDataPacket[]>(
   `SELECT id FROM facilities WHERE id = ? AND type = 'PHARMACY'`,
   [pharmacyFacilityId]
 );
 if (pharmRows.length === 0) {
   throw new Error("Selected pharmacy facility does not exist");
 }

 await pool.query(
 `
 INSERT INTO prescriptions
 (
  id,
  encounter_id,
  patient_id,
  medication_id,
  dose,
  frequency,
  duration_days,
  refills_allowed,
  instructions,
  status,
  pharmacy_facility_id
 )
 VALUES
 (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
 `,
 [
  uuid(),
  data.encounter_id,
  data.patient_id,
  data.medication_id,
  data.dose,
  data.frequency,
  data.duration_days,
  Number.isFinite(Number(data.refills_allowed))
    ? Number(data.refills_allowed)
    : 0,
  data.instructions,
  pharmacyFacilityId
 ]
 );

 return {
  message:
  "Prescription created",
  routed: !!pharmacyFacilityId
 };

};

/**
 * Create a lab order for an encounter. The provider lists the tests the patient
 * must take; each becomes a `lab_order_tests` row. Patients later upload their
 * result files against the order from their portal.
 *
 * `data.tests` may be an array of strings or of `{ test_name, instructions }`.
 */
export const createLabOrderService = async (data: RowDataPacket) => {
  if (!data.encounter_id || !data.patient_id) {
    throw new Error("encounter_id and patient_id are required");
  }

  const rawTests: unknown[] = Array.isArray(data.tests) ? data.tests : [];
  const tests = rawTests
    .map((t) =>
      typeof t === "string"
        ? { test_name: t.trim(), instructions: null }
        : t && typeof t === "object"
          ? {
              test_name: String((t as { test_name?: unknown }).test_name ?? "").trim(),
              instructions: (t as { instructions?: unknown }).instructions
                ? String((t as { instructions?: unknown }).instructions).trim()
                : null
            }
          : { test_name: "", instructions: null }
    )
    .filter((t) => t.test_name.length > 0);

  if (tests.length === 0) {
    throw new Error("At least one test is required for a lab order");
  }

  const labOrderId = uuid();

  const facilityId = await resolveEncounterFacilityId(data.encounter_id);
  const labFacilityId = await resolveHospitalUnitId(facilityId, "LAB");

  await pool.query(
    `
    INSERT INTO lab_orders
      (id, encounter_id, patient_id, lab_facility_id, ordered_at, status)
    VALUES (?, ?, ?, ?, NOW(), 'ORDERED')
    `,
    [labOrderId, data.encounter_id, data.patient_id, labFacilityId]
  );

  for (const t of tests) {
    await pool.query(
      `
      INSERT INTO lab_order_tests
        (id, lab_order_id, test_name, instructions)
      VALUES (?, ?, ?, ?)
      `,
      [uuid(), labOrderId, t.test_name, t.instructions]
    );
  }

  return {
    id: labOrderId,
    message: "Lab order created",
    routed: !!labFacilityId
  };
};

/**
 * Verify that the provider behind `userId` has treated `patientId` (i.e. shares
 * at least one appointment). Returns the resolved providerId or throws.
 */
const assertProviderTreatsPatient = async (
  userId: string,
  patientId: string
): Promise<string> => {
  const providerId = await getProviderIdByUser(userId);
  if (!providerId) {
    throw new Error("Provider not found");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM appointments
    WHERE provider_id = ? AND patient_id = ?
    LIMIT 1
    `,
    [providerId, patientId]
  );

  if (rows.length === 0) {
    throw new Error("This patient is not under your care");
  }

  return providerId;
};

/**
 * List the distinct patients a provider has treated (anyone with an appointment
 * booked with them), newest activity first.
 */
export const getProviderPatientsService = async (userId: string) => {
  const providerId = await getProviderIdByUser(userId);
  if (!providerId) {
    throw new Error("Provider not found");
  }

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
      COUNT(a.id) AS appointment_count,
      MAX(a.scheduled_at) AS last_visit
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.provider_id = ?
    GROUP BY p.id
    ORDER BY last_visit DESC
    `,
    [providerId]
  );

  return rows;
};

/**
 * Full detail view of one of the provider's patients: demographics, uploaded
 * documents, and lab orders (requested tests + uploaded result files).
 */
export const getProviderPatientDetailService = async (
  userId: string,
  patientId: string
) => {
  await assertProviderTreatsPatient(userId, patientId);

  const [patientRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT id, mrn, first_name, last_name, dob, sex, phone, email
    FROM patients
    WHERE id = ?
    `,
    [patientId]
  );

  if (patientRows.length === 0) {
    throw new Error("Patient not found");
  }

  const [documents] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      id, type, file_name, mime, uploaded_at,
      OCTET_LENGTH(file_data) AS size_bytes
    FROM documents
    WHERE patient_id = ?
    ORDER BY uploaded_at DESC
    `,
    [patientId]
  );

  const [labOrders] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      lo.id,
      lo.encounter_id,
      lo.ordered_at,
      lo.status,
      f.name AS facility_name
    FROM lab_orders lo
    LEFT JOIN encounters e ON lo.encounter_id = e.id
    LEFT JOIN appointments a ON e.appointment_id = a.id
    LEFT JOIN facilities f ON a.facility_id = f.id
    WHERE lo.patient_id = ?
    ORDER BY lo.ordered_at DESC
    `,
    [patientId]
  );

  for (const order of labOrders) {
    const [tests] = await pool.query<RowDataPacket[]>(
      `
      SELECT id, test_name, instructions
      FROM lab_order_tests
      WHERE lab_order_id = ?
      ORDER BY created_at ASC
      `,
      [order.id]
    );

    const [uploads] = await pool.query<RowDataPacket[]>(
      `
      SELECT id, test_name, file_name, mime, note, uploaded_at,
             OCTET_LENGTH(file_data) AS size_bytes
      FROM lab_order_results
      WHERE lab_order_id = ?
      ORDER BY uploaded_at DESC
      `,
      [order.id]
    );

    order.tests = tests;
    order.uploads = uploads;
  }

  return {
    patient: patientRows[0],
    documents,
    labOrders
  };
};

/**
 * Download a patient's uploaded document, scoped to the provider's patients.
 */
export const getProviderPatientDocumentFileService = async (
  userId: string,
  patientId: string,
  documentId: string
) => {
  await assertProviderTreatsPatient(userId, patientId);

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT file_name, mime, file_data
    FROM documents
    WHERE id = ? AND patient_id = ?
    `,
    [documentId, patientId]
  );

  if (rows.length === 0) {
    throw new Error("Document not found");
  }

  return rows[0];
};

/**
 * Download a patient-uploaded lab result file. The provider must treat the
 * patient who owns the parent lab order.
 */
export const getProviderLabResultFileService = async (
  userId: string,
  resultId: string
) => {
  const providerId = await getProviderIdByUser(userId);
  if (!providerId) {
    throw new Error("Provider not found");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      r.file_name,
      r.mime,
      r.file_data,
      lo.patient_id
    FROM lab_order_results r
    JOIN lab_orders lo ON r.lab_order_id = lo.id
    WHERE r.id = ?
    `,
    [resultId]
  );

  if (rows.length === 0) {
    throw new Error("Result not found");
  }

  const [link] = await pool.query<RowDataPacket[]>(
    `
    SELECT 1 FROM appointments
    WHERE provider_id = ? AND patient_id = ?
    LIMIT 1
    `,
    [providerId, rows[0].patient_id]
  );

  if (link.length === 0) {
    throw new Error("This patient is not under your care");
  }

  return rows[0];
};

/* ----------------------------------------------------------------
   PROVIDER LAB ORDERS DASHBOARD
   - Lists every lab order whose underlying encounter belongs to
     the signed-in provider.
   - Lets the provider record results (which auto-completes the
     order's status).
-----------------------------------------------------------------*/

const resolveProviderId = async (userId: string): Promise<string> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM providers WHERE user_id = ?`,
    [userId]
  );
  if (rows.length === 0) {
    throw new Error("Provider not found");
  }
  return rows[0].id;
};

export interface ProviderLabOrdersFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

const clampLabPagination = (page?: number, limit?: number) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(
    100,
    Math.max(1, Number(limit) || 20)
  );
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit
  };
};

const VALID_LAB_STATUSES = [
  "ORDERED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
];

export const getMyLabOrdersService = async (
  userId: string,
  filters: ProviderLabOrdersFilters = {}
) => {
  const providerId = await resolveProviderId(userId);

  const where: string[] = ["e.provider_id = ?"];
  const params: unknown[] = [providerId];

  if (filters.search) {
    where.push(
      "(pat.first_name LIKE ? OR pat.last_name LIKE ? OR pat.mrn LIKE ? OR lo.id LIKE ?)"
    );
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }

  if (filters.status && VALID_LAB_STATUSES.includes(filters.status)) {
    where.push("lo.status = ?");
    params.push(filters.status);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { page, limit, offset } = clampLabPagination(
    filters.page,
    filters.limit
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      lo.id,
      lo.encounter_id,
      lo.patient_id,
      lo.ordered_at,
      lo.status,
      pat.first_name,
      pat.last_name,
      pat.mrn,
      (
        (SELECT COUNT(*) FROM lab_results lr
          WHERE lr.lab_order_id = lo.id)
        +
        (SELECT COUNT(*) FROM lab_order_results lor
          WHERE lor.lab_order_id = lo.id)
      ) AS result_count
    FROM lab_orders lo
    JOIN encounters e
      ON lo.encounter_id = e.id
    JOIN patients pat
      ON lo.patient_id = pat.id
    ${whereSql}
    ORDER BY lo.ordered_at DESC
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM lab_orders lo
    JOIN encounters e
      ON lo.encounter_id = e.id
    JOIN patients pat
      ON lo.patient_id = pat.id
    ${whereSql}
    `,
    params
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};

export const getMyLabOrderByIdService = async (
  userId: string,
  labOrderId: string
) => {
  const providerId = await resolveProviderId(userId);

  const [orderRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      lo.id,
      lo.encounter_id,
      lo.patient_id,
      lo.ordered_at,
      lo.status,
      pat.first_name,
      pat.last_name,
      pat.mrn
    FROM lab_orders lo
    JOIN encounters e
      ON lo.encounter_id = e.id
    JOIN patients pat
      ON lo.patient_id = pat.id
    WHERE lo.id = ? AND e.provider_id = ?
    `,
    [labOrderId, providerId]
  );

  if (orderRows.length === 0) {
    throw new Error("Lab order not found");
  }

  const [results] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      id,
      test,
      value,
      unit,
      reference_range,
      flag,
      observed_at
    FROM lab_results
    WHERE lab_order_id = ?
    ORDER BY observed_at DESC
    `,
    [labOrderId]
  );

  const [uploads] = await pool.query<RowDataPacket[]>(
    `
    SELECT id, test_name, file_name, mime, note, uploaded_at,
           OCTET_LENGTH(file_data) AS size_bytes
    FROM lab_order_results
    WHERE lab_order_id = ?
    ORDER BY uploaded_at DESC
    `,
    [labOrderId]
  );

  return {
    ...orderRows[0],
    results,
    uploads
  };
};

const VALID_FLAGS = ["NORMAL", "LOW", "HIGH", "CRITICAL"];

export interface LabResultInput {
  test: string;
  value: string;
  unit?: string | null;
  reference_range?: string | null;
  flag?: string | null;
  observed_at?: string | null;
}

export const addLabResultsService = async (
  userId: string,
  labOrderId: string,
  results: LabResultInput[]
) => {
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("At least one result is required");
  }

  const providerId = await resolveProviderId(userId);

  /* Authorize: order must belong to this provider's encounter. */
  const [orderRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT lo.id
    FROM lab_orders lo
    JOIN encounters e
      ON lo.encounter_id = e.id
    WHERE lo.id = ? AND e.provider_id = ?
    `,
    [labOrderId, providerId]
  );

  if (orderRows.length === 0) {
    throw new Error("Lab order not found");
  }

  for (const r of results) {
    if (!r.test || typeof r.test !== "string") {
      throw new Error("Each result needs a test name");
    }
    if (
      r.value === undefined ||
      r.value === null ||
      String(r.value).trim() === ""
    ) {
      throw new Error(`Value is required for "${r.test}"`);
    }
    if (
      r.flag &&
      !VALID_FLAGS.includes(String(r.flag).toUpperCase())
    ) {
      throw new Error(
        `Flag must be one of ${VALID_FLAGS.join(", ")}`
      );
    }
  }

  const observedDefault = new Date();

  for (const r of results) {
    await pool.query(
      `
      INSERT INTO lab_results
      (
        id,
        lab_order_id,
        test,
        value,
        unit,
        reference_range,
        flag,
        observed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        uuid(),
        labOrderId,
        r.test.trim(),
        String(r.value).trim(),
        r.unit ? String(r.unit).trim() : null,
        r.reference_range
          ? String(r.reference_range).trim()
          : null,
        r.flag ? String(r.flag).toUpperCase() : null,
        r.observed_at ? new Date(r.observed_at) : observedDefault
      ]
    );
  }

  await pool.query(
    `UPDATE lab_orders SET status = 'COMPLETED' WHERE id = ?`,
    [labOrderId]
  );

  return {
    message: "Results saved",
    inserted: results.length
  };
};

export const createScheduleService =
async (
  userId:string,
  data: CreateScheduleInput
) => {

  const [providerRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT id
      FROM providers
      WHERE user_id=?
      `,
      [userId]
    );

  const providerId =
    providerRows[0].id;

  const templateId =
    uuid();

  await pool.query(
    `
    INSERT INTO provider_schedule_templates
    (
      id,
      provider_id,
      template_name,
      effective_start_date,
      effective_end_date,
      run_indefinitely,
      appointment_duration,
      buffer_time,
      allow_in_person,
      allow_video
    )
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      templateId,
      providerId,
      data.template_name,
      data.effective_start_date,
      data.effective_end_date || null,
      data.run_indefinitely,
      data.appointment_duration,
      data.buffer_time,
      data.allow_in_person,
      data.allow_video
    ]
  );

  for(const block of data.blocks){

    await pool.query(
      `
      INSERT INTO provider_schedule_blocks
      (
        id,
        template_id,
        weekday,
        start_time,
        end_time
      )
      VALUES
      (?, ?, ?, ?, ?)
      `,
      [
        uuid(),
        templateId,
        block.weekday,
        block.start_time,
        block.end_time
      ]
    );

  }

  return {
    message:
    "Schedule created successfully"
  };

};


export const getSchedulesService =
async (
  userId:string
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
      pst.*
      FROM provider_schedule_templates pst
      JOIN providers p
      ON pst.provider_id=p.id
      WHERE p.user_id=?
      `,
      [userId]
    );

  return rows;

};


export const updateScheduleService =
async (
  scheduleId:string,
  data: Record<string, never>
) => {

  await pool.query(
    `
    UPDATE provider_schedule_templates
    SET
      template_name=?,
      appointment_duration=?,
      buffer_time=?
    WHERE id=?
    `,
    [
      data.template_name,
      data.appointment_duration,
      data.buffer_time,
      scheduleId
    ]
  );

  return {
    message:
    "Schedule updated"
  };

};

export const createOverrideService =
async (
  userId:string,
  data: Record<string, never>
) => {

  const [providerRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT id
      FROM providers
      WHERE user_id=?
      `,
      [userId]
    );

  if (providerRows.length === 0) {
    throw new Error("Provider not found");
  }
  const providerId =
    providerRows[0].id;

  /* Basic validation so we never insert an obviously-invalid window */
  if (!data.start_datetime || !data.end_datetime) {
    throw new Error("start_datetime and end_datetime are required");
  }
  if (new Date(data.start_datetime) >= new Date(data.end_datetime)) {
    throw new Error("end_datetime must be after start_datetime");
  }

  const overrideId = uuid();

  await pool.query(
    `
    INSERT INTO provider_schedule_overrides
    (
      id,
      provider_id,
      override_type,
      start_datetime,
      end_datetime,
      reason,
      action_for_existing,
      colleague_provider_id
    )
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      overrideId,
      providerId,
      data.override_type,
      data.start_datetime,
      data.end_datetime,
      data.reason,
      data.action_for_existing,
      data.colleague_provider_id || null
    ]
  );

  /* If the doctor is marking themselves UNAVAILABLE, run the same cascade
     the admin endpoint runs: flip affected appointments to
     PENDING_REASSIGNMENT, send patient emails + in-app notifications. */
  let affectedCount = 0;
  if (data.override_type === "UNAVAILABLE") {
    const r = await processUnavailabilityImpact({
      providerId,
      overrideId,
      start_datetime: data.start_datetime,
      end_datetime: data.end_datetime,
      reason: data.reason ?? null,
    });
    affectedCount = r.affectedCount;
  }

  return {
    message: "Override added",
    overrideId,
    affectedCount
  };

};


export const deleteScheduleService =
async (
  scheduleId:string
) => {

  await pool.query(
    `
    DELETE
    FROM provider_schedule_templates
    WHERE id=?
    `,
    [scheduleId]
  );

  return {
    message:
    "Schedule deleted"
  };

};

export const getOverridesService =
async (
  userId:string
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT o.*
      FROM provider_schedule_overrides o
      JOIN providers p
      ON o.provider_id=p.id
      WHERE p.user_id=?
      ORDER BY o.created_at DESC
      `,
      [userId]
    );

  return rows;

};

export const deleteOverrideService =
async (
  id:string
) => {

  /* Restore PENDING_REASSIGNMENT appointments first so patients
     don't see action-required if the override is being removed. */
  let restoredCount = 0;
  try {
    const r = await reverseUnavailabilityImpact(id);
    restoredCount = r.restoredCount;
  } catch (e) {
    logger.warn("reverseUnavailabilityImpact failed:", (e as Error).message);
  }

  /* Detach remaining appointment FK references (e.g. already-rescheduled
     appts) so the row can be deleted. */
  await pool.query(
    `UPDATE appointments
        SET unavailability_id = NULL
      WHERE unavailability_id = ?`,
    [id]
  );

  await pool.query(
    `
    DELETE
    FROM provider_schedule_overrides
    WHERE id=?
    `,
    [id]
  );

  return {
    message: "Override removed",
    restoredCount
  };


};
export const getProviderAvailabilityService =
async (
  providerId: string,
  date: string
) => {

  const day =
    new Date(date).getDay();

  const [templates] = await pool.query<RowDataPacket[]>(
      `
      SELECT *
      FROM provider_schedule_templates
      WHERE provider_id = ?
      AND is_active = TRUE
      `,
      [providerId]
    );

  if (templates.length === 0) {
    throw new Error(
      "No active schedule found"
    );
  }

  const template =
    templates[0];

  const [blocks] = await pool.query<RowDataPacket[]>(
      `
      SELECT *
      FROM provider_schedule_blocks
      WHERE template_id = ?
      AND weekday = ?
      `,
      [
        template.id,
        day
      ]
    );

  const [appointments] = await pool.query<RowDataPacket[]>(
      `
      SELECT scheduled_at
      FROM appointments
      WHERE provider_id = ?
      AND DATE(scheduled_at) = ?
      AND status != 'CANCELLED'
      `,
      [
        providerId,
        date
      ]
    );

  const bookedSlots =
    appointments.map(
      (a: RowDataPacket) =>
      new Date(a.scheduled_at)
        .toTimeString()
        .slice(0,5)
    );

  const availableSlots: string[] = [];

  for(const block of blocks){

    let current =
      block.start_time;

    while(
      current <
      block.end_time
    ){

      const slot =
        current.slice(0,5);

      if(
        !bookedSlots.includes(
          slot
        )
      ){
        availableSlots.push(
          slot
        );
      }

      const [hour, minute] =
        current
          .split(":")
          .map(Number);

      const next =
        new Date();

      next.setHours(
        hour
      );

      next.setMinutes(
        minute +
        template.appointment_duration
      );

      current =
        next
        .toTimeString()
        .slice(0,8);

    }

  }

  return {
    providerId,
    date,
    slots:
      availableSlots
  };

};
export const getProviderAppointmentsService =
async (
  userId: string
) => {

  const [providerRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT id
      FROM providers
      WHERE user_id = ?
      `,
      [userId]
    );

  if(providerRows.length === 0){
    throw new Error(
      "Provider not found"
    );
  }

  const providerId =
    providerRows[0].id;

  const [appointments] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        a.*,
        p.first_name,
        p.last_name,
        p.mrn,
        p.dob,
        p.sex
      FROM appointments a
      JOIN patients p
      ON a.patient_id = p.id
      WHERE a.provider_id = ?
      ORDER BY a.scheduled_at DESC
      `,
      [providerId]
    );

  return {
    success: true,
    data: appointments
  };

};
