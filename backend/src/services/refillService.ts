import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import {
  getPatientIdByUser,
  getProviderIdByUser
} from "../utils/identity";
import { writeAuditLog } from "./auditService";
import { ActorContext } from "../utils/auditContext";
import { createNotification } from "./notificationService";
import { logger } from "../utils/logger";

/** Best-effort patient notification when a refill request is decided. */
const notifyPatientRefillDecision = async (
  prescriptionId: string,
  status: "APPROVED" | "REJECTED"
) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT pt.user_id, m.name AS medication_name
        FROM prescriptions rx
        JOIN patients pt ON rx.patient_id = pt.id
        LEFT JOIN medications m ON rx.medication_id = m.id
       WHERE rx.id = ?
      `,
      [prescriptionId]
    );
    const row = rows[0];
    if (!row?.user_id) return;

    const med = row.medication_name ? ` for ${row.medication_name}` : "";
    await createNotification({
      userId: row.user_id,
      type: status === "APPROVED" ? "REFILL_APPROVED" : "REFILL_REJECTED",
      title:
        status === "APPROVED"
          ? "Refill request approved"
          : "Refill request rejected",
      body:
        status === "APPROVED"
          ? `Your refill request${med} was approved by the doctor and is now with the pharmacy to be dispensed.`
          : `Your refill request${med} was rejected.`,
      link: "/patient/refill-requests",
    });
  } catch (err) {
    logger.error("Failed to create refill notification:", err);
  }
};

const requirePatient = async (userId: string) => {
  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }
  return patientId;
};

const requireProvider = async (userId: string) => {
  const providerId = await getProviderIdByUser(userId);
  if (!providerId) {
    throw new Error("No provider record linked to this account");
  }
  return providerId;
};

/**
 * List the patient's prescriptions with medication + prescriber details and
 * the status of the most recent refill request (when present).
 */
export const listPatientPrescriptionsService = async (
  userId: string
) => {
  const patientId = await requirePatient(userId);

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      rx.id,
      rx.dose,
      rx.frequency,
      rx.duration_days,
      rx.refills_allowed,
      rx.refills_used,
      rx.instructions,
      rx.prescribed_at,
      rx.status,
      m.name AS medication_name,
      m.generic_name,
      prov.name AS provider_name,
      phf.name AS pharmacy_facility_name,
      (
        SELECT rr.status
        FROM refill_requests rr
        WHERE rr.prescription_id = rx.id
        ORDER BY rr.requested_at DESC
        LIMIT 1
      ) AS last_refill_status
    FROM prescriptions rx
    LEFT JOIN medications m ON rx.medication_id = m.id
    LEFT JOIN encounters e ON rx.encounter_id = e.id
    LEFT JOIN providers prov ON e.provider_id = prov.id
    LEFT JOIN facilities phf ON phf.id = rx.pharmacy_facility_id
    WHERE rx.patient_id = ?
    ORDER BY rx.prescribed_at DESC
    `,
    [patientId]
  );

  return rows;
};

/**
 * Patient requests a refill for one of their prescriptions. Blocks duplicate
 * PENDING requests and refills beyond the allowed count.
 */
export const createRefillRequestService = async (
  userId: string,
  prescriptionId: string
) => {
  const patientId = await requirePatient(userId);

  const [rxRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT id
    FROM prescriptions
    WHERE id = ? AND patient_id = ?
    `,
    [prescriptionId, patientId]
  );

  if (rxRows.length === 0) {
    throw new Error("Prescription not found");
  }

  const [pending] = await pool.query<RowDataPacket[]>(
    `
    SELECT id, status FROM refill_requests
    WHERE prescription_id = ? AND status IN ('PENDING','APPROVED')
    `,
    [prescriptionId]
  );

  if (pending.length > 0) {
    throw new Error(
      pending[0].status === "APPROVED"
        ? "A refill is already approved and waiting to be dispensed by the pharmacy"
        : "A refill request is already pending for this prescription"
    );
  }

  /* The doctor authorises each refill on approval, so we don't block the
     request on a pre-set refills_allowed count — the patient can always ask
     and the prescriber decides. */

  const id = uuid();

  await pool.query(
    `
    INSERT INTO refill_requests
      (id, prescription_id, status, requested_at)
    VALUES (?, ?, 'PENDING', NOW())
    `,
    [id, prescriptionId]
  );

  return { id };
};

/**
 * Patient view of their own refill requests across all prescriptions.
 */
export const listPatientRefillsService = async (userId: string) => {
  const patientId = await requirePatient(userId);

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      rr.id,
      rr.prescription_id,
      rr.status,
      rr.requested_at,
      rr.decided_at,
      m.name AS medication_name
    FROM refill_requests rr
    JOIN prescriptions rx ON rr.prescription_id = rx.id
    LEFT JOIN medications m ON rx.medication_id = m.id
    WHERE rx.patient_id = ?
    ORDER BY rr.requested_at DESC
    `,
    [patientId]
  );

  return rows;
};

/**
 * Provider queue of refill requests for prescriptions tied to their encounters.
 * Optional status filter (defaults to PENDING).
 */
export const listProviderRefillsService = async (
  userId: string,
  status?: string
) => {
  const providerId = await requireProvider(userId);

  const where: string[] = ["e.provider_id = ?"];
  const params: unknown[] = [providerId];

  if (status) {
    where.push("rr.status = ?");
    params.push(status);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      rr.id,
      rr.prescription_id,
      rr.status,
      rr.requested_at,
      rr.decided_at,
      m.name AS medication_name,
      rx.dose,
      rx.frequency,
      rx.refills_allowed,
      rx.refills_used,
      CONCAT(pat.first_name, ' ', pat.last_name) AS patient_name
    FROM refill_requests rr
    JOIN prescriptions rx ON rr.prescription_id = rx.id
    JOIN encounters e ON rx.encounter_id = e.id
    LEFT JOIN medications m ON rx.medication_id = m.id
    LEFT JOIN patients pat ON rx.patient_id = pat.id
    WHERE ${where.join(" AND ")}
    ORDER BY rr.requested_at DESC
    `,
    params
  );

  return rows;
};

/**
 * Provider approves or rejects a refill request. Approval increments the
 * prescription's refills_used counter. All decisions are audit-logged.
 */
export const decideRefillRequestService = async (
  userId: string,
  refillId: string,
  decision: string,
  actor?: ActorContext
) => {
  const providerId = await requireProvider(userId);

  const status = (decision || "").toUpperCase();
  if (status !== "APPROVED" && status !== "REJECTED") {
    throw new Error("Decision must be APPROVED or REJECTED");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      rr.id,
      rr.status,
      rr.prescription_id,
      rx.refills_allowed,
      rx.refills_used
    FROM refill_requests rr
    JOIN prescriptions rx ON rr.prescription_id = rx.id
    JOIN encounters e ON rx.encounter_id = e.id
    WHERE rr.id = ? AND e.provider_id = ?
    `,
    [refillId, providerId]
  );

  if (rows.length === 0) {
    throw new Error("Refill request not found");
  }

  const refill = rows[0];

  if (refill.status !== "PENDING") {
    throw new Error("This refill request has already been decided");
  }

  await pool.query(
    `
    UPDATE refill_requests
    SET status = ?, decided_at = NOW(), decided_by = ?
    WHERE id = ?
    `,
    [status, userId, refillId]
  );

  /* On approval we do NOT consume the refill here. The prescription's
     refills_used is incremented only when the pharmacy actually dispenses
     the approved refill, so the queue reflects the real-world flow:
     patient requests -> doctor approves -> pharmacy dispenses. */

  await writeAuditLog({
    actorId: actor?.actorId ?? userId,
    actorRole: actor?.actorRole ?? "PROVIDER",
    action: status === "APPROVED" ? "REFILL_APPROVED" : "REFILL_REJECTED",
    resourceType: "refill_request",
    resourceId: refillId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null
  });

  await notifyPatientRefillDecision(
    refill.prescription_id,
    status as "APPROVED" | "REJECTED"
  );

  return { id: refillId, status };
};
