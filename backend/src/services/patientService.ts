import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";

export const getPatientProfile = async (
  userId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM patients
    WHERE user_id = ?
    `,
    [userId]
  );

  return rows[0];
};

export const updatePatientProfile = async (
  userId: string,
  phone: string,
  email: string,
  photoUrl: string
) => {
  await pool.query(
    `
    UPDATE patients
    SET
      phone = ?,
      email = ?,
      photo_url = ?
    WHERE user_id = ?
    `,
    [phone, email, photoUrl, userId]
  );
};

export const addEmergencyContact = async (
  patientId: string,
  name: string,
  relationship: string,
  phone: string
) => {
  await pool.query(
    `
    INSERT INTO emergency_contacts (
      patient_id,
      name,
      relationship,
      phone
    )
    VALUES (?, ?, ?, ?)
    `,
    [patientId, name, relationship, phone]
  );
};
export const addDependent = async (
  patientId: string,
  firstName: string,
  lastName: string,
  dob: string,
  relationship: string,
  proxyConsent: boolean
) => {
  await pool.query(
    `
    INSERT INTO patient_dependents (
      patient_id,
      first_name,
      last_name,
      dob,
      relationship,
      proxy_consent
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      patientId,
      firstName,
      lastName,
      dob,
      relationship,
      proxyConsent
    ]
  );
};
export const addInsurance = async (
  patientId: string,
  payer: string,
  memberId: string,
  groupNo: string,
  validFrom: string,
  validTo: string
) => {
  await pool.query(
    `
    INSERT INTO insurance (
      patient_id,
      payer,
      member_id,
      group_no,
      valid_from,
      valid_to
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      patientId,
      payer,
      memberId,
      groupNo,
      validFrom,
      validTo
    ]
  );
};
/* ------------------------------------------------------------------
   ENCOUNTERS — patient view (Sprint 4)
-------------------------------------------------------------------*/

const clampPagination = (
  page?: number,
  limit?: number
) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 10));
  return {
    page: p,
    limit: l,
    offset: (p - 1) * l
  };
};

export interface PatientEncounterFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export const getPatientEncounters = async (
  patientId: string,
  filters: PatientEncounterFilters = {}
) => {
  const where: string[] = ["e.patient_id = ?"];
  const params: unknown[] = [patientId];

  if (filters.search) {
    where.push(
      "(p.name LIKE ? OR e.chief_complaint LIKE ? OR f.name LIKE ?)"
    );
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const { page, limit, offset } = clampPagination(
    filters.page,
    filters.limit
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      e.id,
      e.appointment_id,
      e.provider_id,
      e.patient_id,
      e.started_at,
      e.ended_at,
      e.chief_complaint,
      p.name AS provider_name,
      p.specialty AS provider_specialty,
      a.facility_id,
      f.name AS facility_name,
      f.type AS facility_type,
      (
        SELECT GROUP_CONCAT(d.description SEPARATOR ', ')
        FROM diagnoses d
        WHERE d.encounter_id = e.id
      ) AS diagnoses
    FROM encounters e
    LEFT JOIN providers p
      ON e.provider_id = p.id
    LEFT JOIN appointments a
      ON e.appointment_id = a.id
    LEFT JOIN facilities f
      ON a.facility_id = f.id
    ${whereSql}
    ORDER BY e.started_at DESC
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM encounters e
    LEFT JOIN providers p
      ON e.provider_id = p.id
    LEFT JOIN appointments a
      ON e.appointment_id = a.id
    LEFT JOIN facilities f
      ON a.facility_id = f.id
    ${whereSql}
    `,
    params
  );

  const total = countRows[0].total;

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

export const getPatientEncounterById = async (
  patientId: string,
  encounterId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      e.id,
      e.appointment_id,
      e.provider_id,
      e.patient_id,
      e.started_at,
      e.ended_at,
      e.chief_complaint,
      e.vitals,
      e.soap_note,
      p.name AS provider_name,
      p.specialty AS provider_specialty,
      a.facility_id,
      f.name AS facility_name,
      f.type AS facility_type
    FROM encounters e
    LEFT JOIN providers p
      ON e.provider_id = p.id
    LEFT JOIN appointments a
      ON e.appointment_id = a.id
    LEFT JOIN facilities f
      ON a.facility_id = f.id
    WHERE e.id = ? AND e.patient_id = ?
    `,
    [encounterId, patientId]
  );

  if (rows.length === 0) {
    throw new Error("Encounter not found");
  }

  const [diagnoses] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      id,
      icd10_code,
      description,
      is_chronic
    FROM diagnoses
    WHERE encounter_id = ?
    `,
    [encounterId]
  );

  return {
    ...rows[0],
    diagnoses
  };
};

/* ------------------------------------------------------------------
   LAB REPORTS — patient view (Sprint 4)
-------------------------------------------------------------------*/

export interface PatientLabFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export const getPatientLabs = async (
  patientId: string,
  filters: PatientLabFilters = {}
) => {
  const where: string[] = ["lo.patient_id = ?"];
  const params: unknown[] = [patientId];

  if (filters.search) {
    where.push(
      "(lo.status LIKE ? OR f.name LIKE ? OR lo.id LIKE ?)"
    );
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const { page, limit, offset } = clampPagination(
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
      e.provider_id,
      p.name AS provider_name,
      a.facility_id,
      f.name AS facility_name,
      lo.lab_facility_id,
      labf.name AS lab_facility_name,
      (
        SELECT COUNT(*)
        FROM lab_results lr
        WHERE lr.lab_order_id = lo.id
      ) AS result_count,
      (
        SELECT MAX(observed_at)
        FROM lab_results lr
        WHERE lr.lab_order_id = lo.id
      ) AS observed_at
    FROM lab_orders lo
    LEFT JOIN encounters e
      ON lo.encounter_id = e.id
    LEFT JOIN providers p
      ON e.provider_id = p.id
    LEFT JOIN appointments a
      ON e.appointment_id = a.id
    LEFT JOIN facilities f
      ON a.facility_id = f.id
    LEFT JOIN facilities labf
      ON labf.id = lo.lab_facility_id
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
    LEFT JOIN encounters e
      ON lo.encounter_id = e.id
    LEFT JOIN appointments a
      ON e.appointment_id = a.id
    LEFT JOIN facilities f
      ON a.facility_id = f.id
    ${whereSql}
    `,
    params
  );

  const total = countRows[0].total;

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

export const getPatientLabOrderById = async (
  patientId: string,
  labOrderId: string
) => {
  const [orderRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      lo.id,
      lo.encounter_id,
      lo.patient_id,
      lo.ordered_at,
      lo.status,
      p.name AS provider_name,
      f.name AS facility_name,
      lo.lab_facility_id,
      labf.name AS lab_facility_name
    FROM lab_orders lo
    LEFT JOIN encounters e
      ON lo.encounter_id = e.id
    LEFT JOIN providers p
      ON e.provider_id = p.id
    LEFT JOIN appointments a
      ON e.appointment_id = a.id
    LEFT JOIN facilities f
      ON a.facility_id = f.id
    LEFT JOIN facilities labf
      ON labf.id = lo.lab_facility_id
    WHERE lo.id = ? AND lo.patient_id = ?
    `,
    [labOrderId, patientId]
  );

  if (orderRows.length === 0) {
    throw new Error("Lab report not found");
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

  const [tests] = await pool.query<RowDataPacket[]>(
    `
    SELECT id, test_name, instructions
    FROM lab_order_tests
    WHERE lab_order_id = ?
    ORDER BY created_at ASC
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
    tests,
    uploads
  };
};

/**
 * Patient uploads a result file against one of their own lab orders. The file
 * binary is stored in `lab_order_results.file_data`; the order is marked
 * COMPLETED once at least one result has been uploaded.
 */
export const uploadLabResultService = async (
  patientId: string,
  labOrderId: string,
  input: {
    fileName: string;
    mime: string;
    buffer: Buffer;
    testName?: string | null;
    note?: string | null;
  }
) => {
  const [orderRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM lab_orders WHERE id = ? AND patient_id = ?`,
    [labOrderId, patientId]
  );

  if (orderRows.length === 0) {
    throw new Error("Lab order not found");
  }

  const id = uuid();

  await pool.query(
    `
    INSERT INTO lab_order_results
      (id, lab_order_id, test_name, file_name, mime, file_data, note, uploaded_by, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      id,
      labOrderId,
      input.testName || null,
      input.fileName,
      input.mime,
      input.buffer,
      input.note || null,
      patientId
    ]
  );

  await pool.query(
    `UPDATE lab_orders SET status = 'COMPLETED' WHERE id = ?`,
    [labOrderId]
  );

  return { id };
};

/**
 * Download a result file the patient previously uploaded (scoped to owner).
 */
export const getPatientLabResultFileService = async (
  patientId: string,
  resultId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT r.file_name, r.mime, r.file_data
    FROM lab_order_results r
    JOIN lab_orders lo ON r.lab_order_id = lo.id
    WHERE r.id = ? AND lo.patient_id = ?
    `,
    [resultId, patientId]
  );

  if (rows.length === 0) {
    throw new Error("Result not found");
  }

  return rows[0];
};

/* ------------------------------------------------------------------
   INSURANCE — patient view + manage (Sprint 4)
-------------------------------------------------------------------*/

export const getPatientInsurance = async (
  patientId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      id,
      patient_id,
      payer,
      member_id,
      group_no,
      valid_from,
      valid_to
    FROM insurance
    WHERE patient_id = ?
    ORDER BY valid_from DESC
    `,
    [patientId]
  );

  return rows;
};

export const updatePatientInsurance = async (
  patientId: string,
  insuranceId: string,
  data: {
    payer?: string;
    member_id?: string;
    group_no?: string | null;
    valid_from?: string | null;
    valid_to?: string | null;
  }
) => {
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM insurance WHERE id = ? AND patient_id = ?`,
    [insuranceId, patientId]
  );

  if (existing.length === 0) {
    throw new Error("Insurance not found");
  }

  const sets: string[] = [];
  const params: unknown[] = [];

  for (const key of [
    "payer",
    "member_id",
    "group_no",
    "valid_from",
    "valid_to"
  ] as const) {
    if (data[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(data[key]);
    }
  }

  if (sets.length === 0) {
    throw new Error("No fields to update");
  }

  params.push(insuranceId);

  await pool.query(
    `UPDATE insurance SET ${sets.join(", ")} WHERE id = ?`,
    params
  );
};

export const deletePatientInsurance = async (
  patientId: string,
  insuranceId: string
) => {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM insurance WHERE id = ? AND patient_id = ?`,
    [insuranceId, patientId]
  );

  if (result.affectedRows === 0) {
    throw new Error("Insurance not found");
  }
};
export const getDependents = async (
  patientId: string
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM patient_dependents
    WHERE patient_id = ?
    `,
    [patientId]
  );

  return rows;
};
export const getEmergencyContacts = async (
  patientId: string
) => {

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM emergency_contacts
    WHERE patient_id = ?
    `,
    [patientId]
  );

  return rows;
};