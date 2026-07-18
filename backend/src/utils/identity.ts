import type { RowDataPacket } from "mysql2";
import pool from "../config/db";

/**
 * Resolve the patients.id for the user behind a JWT (users.id).
 * Returns null when the user has no linked patient record.
 */
export const getPatientIdByUser = async (
  userId: string
): Promise<string | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM patients WHERE user_id = ?`,
    [userId]
  );
  return rows.length ? rows[0].id : null;
};

/**
 * Resolve the providers.id for the user behind a JWT (users.id).
 * Returns null when the user has no linked provider record.
 */
export const getProviderIdByUser = async (
  userId: string
): Promise<string | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM providers WHERE user_id = ?`,
    [userId]
  );
  return rows.length ? rows[0].id : null;
};

/* =====================================================================
   SPRINT 12 — PHARMACY FACILITY SCOPING
   ---------------------------------------------------------------------
   A pharmacy user only ever sees prescriptions whose
   prescriptions.pharmacy_facility_id is one of the PHARMACY facilities
   they are assigned to in facility_staff. These helpers are the single
   source of truth for that scoping.
====================================================================== */

export interface PharmacyFacility {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  hospital_name: string | null;
}

/**
 * Return the PHARMACY-type facility IDs that this user can act on.
 * Empty array means the user has no pharmacy assignment yet.
 */
export const getPharmacistFacilityIds = async (
  userId: string
): Promise<string[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT fs.facility_id
      FROM facility_staff fs
      JOIN facilities     f  ON fs.facility_id = f.id
     WHERE fs.user_id = ?
       AND fs.staff_role = 'PHARMACY'
       AND f.type        = 'PHARMACY'
    `,
    [userId]
  );
  return rows.map((r: RowDataPacket) => r.facility_id);
};

/**
 * Return rich pharmacy facility records for the dashboard header.
 * Hospital affiliation is inferred from the pharmacy name prefix
 * (e.g. "Apollo Pharmacy" -> "Apollo Hospital") because the schema
 * does not store a formal hospital<->pharmacy link.
 */
export const getPharmacistFacilities = async (
  userId: string
): Promise<PharmacyFacility[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      f.id,
      f.name,
      f.address,
      f.phone,
      (
        SELECT h.name
          FROM facilities h
         WHERE h.type = 'HOSPITAL'
           AND (
                 h.name = REPLACE(f.name, ' Pharmacy', ' Hospital')
              OR h.name LIKE CONCAT(SUBSTRING_INDEX(f.name, ' ', 1), '%')
           )
         ORDER BY
           CASE WHEN h.name = REPLACE(f.name, ' Pharmacy', ' Hospital')
                THEN 0 ELSE 1 END,
           h.name
         LIMIT 1
      ) AS hospital_name
    FROM facility_staff fs
    JOIN facilities     f ON fs.facility_id = f.id
    WHERE fs.user_id = ?
      AND fs.staff_role = 'PHARMACY'
      AND f.type        = 'PHARMACY'
    ORDER BY f.name
    `,
    [userId]
  );
  return rows as PharmacyFacility[];
};

/**
 * Returns true when the user may act on a prescription. A pharmacist with no
 * facility assignment operates the shared/global pharmacy and owns routed
 * prescription. Assigned pharmacists own prescriptions routed to one of their
 * facilities, plus prescriptions not yet routed (pharmacy_facility_id IS NULL) so the
 * pharmacy can still work the queue while order-routing (Sprint 12) rolls out.
 */
export const pharmacistOwnsPrescription = async (
  userId: string,
  prescriptionId: string
): Promise<boolean> => {
  const facilityIds = await getPharmacistFacilityIds(userId);

  if (facilityIds.length === 0) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 1 FROM prescriptions WHERE id = ? LIMIT 1`,
      [prescriptionId]
    );
    return rows.length > 0;
  }

  const placeholders = facilityIds.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT 1
      FROM prescriptions
     WHERE id = ?
       AND (pharmacy_facility_id IS NULL
            OR pharmacy_facility_id IN (${placeholders}))
     LIMIT 1
    `,
    [prescriptionId, ...facilityIds]
  );
  return rows.length > 0;
};

/**
 * Returns true when the refill request's parent prescription is routed to one
 * of the user's assigned pharmacy facilities (or is unrouted, or the user is a
 * global pharmacist). Mirrors `pharmacistOwnsPrescription`.
 */
export const pharmacistOwnsRefill = async (
  userId: string,
  refillId: string
): Promise<boolean> => {
  const facilityIds = await getPharmacistFacilityIds(userId);

  if (facilityIds.length === 0) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 1 FROM refill_requests WHERE id = ? LIMIT 1`,
      [refillId]
    );
    return rows.length > 0;
  }

  const placeholders = facilityIds.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT 1
      FROM refill_requests rr
      JOIN prescriptions   rx ON rr.prescription_id = rx.id
     WHERE rr.id = ?
       AND (rx.pharmacy_facility_id IS NULL
            OR rx.pharmacy_facility_id IN (${placeholders}))
     LIMIT 1
    `,
    [refillId, ...facilityIds]
  );
  return rows.length > 0;
};

/**
 * Thrown when a pharmacist tries to act on a prescription / refill
 * that does not belong to one of their assigned facilities.
 * Controllers turn this into a 403 Forbidden response.
 */
export class PharmacyForbiddenError extends Error {
  constructor(message = "Forbidden — not your pharmacy's prescription") {
    super(message);
    this.name = "PharmacyForbiddenError";
  }
}
