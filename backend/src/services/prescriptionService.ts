import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import { writeAuditLog } from "./auditService";
import { ActorContext } from "../utils/auditContext";
import { createNotification } from "./notificationService";
import {
  getPharmacistFacilityIds,
  getPharmacistFacilities,
  pharmacistOwnsPrescription,
  pharmacistOwnsRefill,
  PharmacyForbiddenError,
} from "../utils/identity";
import { logger } from "../utils/logger";

const VALID_STATUSES = ["ACTIVE", "DISPENSED", "CANCELLED"] as const;
type RxStatus = (typeof VALID_STATUSES)[number];

/**
 * Build the SQL fragment + parameters that constrain prescription /
 * refill queries to the pharmacist's assigned facilities. Unassigned
 * (global) pharmacists see everything; assigned pharmacists see their
 * routed prescriptions plus prescriptions not yet routed (see body for rationale).
 */
const facilityScope = (facilityIds: string[]) => {
  /*
   * A pharmacist with no facility assignment operates the shared/global
   * pharmacy and can see every prescription. Assigned pharmacists see the
   * prescriptions routed to their facilities PLUS prescriptions that have not been
   * routed yet (pharmacy_facility_id IS NULL) so the queue is never empty
   * while order-routing (Sprint 12) is still being rolled out.
   */
  if (facilityIds.length === 0) {
    return { sql: "1 = 1", params: [] as string[] };
  }
  const placeholders = facilityIds.map(() => "?").join(",");
  return {
    sql: `(rx.pharmacy_facility_id IN (${placeholders}) OR rx.pharmacy_facility_id IS NULL)`,
    params: facilityIds,
  };
};

/**
 * Derive the live price for a prescription row produced by
 * buildPrescriptionQuery. Paid prescriptions show their snapshotted amount;
 * otherwise the current catalogue price (or null when the medicine is not in
 * the pharmacy's catalogue / not routed yet).
 */
const computeRxPrice = (row: RowDataPacket): number | null => {
  if (row.payment_status === "PAID" && row.amount != null) {
    return Number(row.amount);
  }
  return row.catalog_price != null ? Number(row.catalog_price) : null;
};

/**
 * For unrouted prescriptions (pharmacy_facility_id IS NULL) the catalogue
 * join can't resolve a price, so when a pharmacist is viewing we look the
 * medicine up in their own facilities' catalogue. Returns a map keyed by
 * medication_id -> price.
 */
const buildPharmacyPriceBook = async (
  facilityIds: string[]
): Promise<Map<string, number>> => {
  const map = new Map<string, number>();
  if (facilityIds.length === 0) return map;
  const placeholders = facilityIds.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT medication_id, price FROM pharmacy_medicines
      WHERE is_active = 1 AND pharmacy_facility_id IN (${placeholders})`,
    facilityIds
  );
  for (const r of rows) {
    if (!map.has(r.medication_id)) {
      map.set(r.medication_id, Number(r.price));
    }
  }
  return map;
};

const clampPagination = (page?: number, limit?: number) => {
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

/* ------------------------------------------------------------------
   QUICK MEDICATION SEARCH (used by provider's prescription form
   and the pharmacy's filter dropdowns).
-------------------------------------------------------------------*/
export const searchMedicationsService = async (
  q?: string,
  limit?: number
) => {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const term = `%${(q || "").trim()}%`;

  const [rows] = await pool.query<RowDataPacket[]>(
    q
      ? `SELECT id, name, generic_name, ndc_code, atc_class
         FROM medications
         WHERE name LIKE ? OR generic_name LIKE ? OR ndc_code LIKE ?
         ORDER BY name
         LIMIT ${safeLimit}`
      : `SELECT id, name, generic_name, ndc_code, atc_class
         FROM medications
         ORDER BY name
         LIMIT ${safeLimit}`,
    q ? [term, term, term] : []
  );

  return rows;
};

/* ------------------------------------------------------------------
   PHARMACY DASHBOARD STATS  (Sprint 12: scoped by facility_staff)
-------------------------------------------------------------------*/
export const getPharmacyStatsService = async (
  pharmacyUserId: string
) => {
  const facilityIds = await getPharmacistFacilityIds(pharmacyUserId);

  if (facilityIds.length === 0) {
    return {
      totalPrescriptions: 0,
      pendingPrescriptions: 0,
      dispensedToday: 0,
      pendingRefills: 0,
      assigned: false as const,
    };
  }

  const placeholders = facilityIds.map(() => "?").join(",");

  const [[{ total }]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
       FROM prescriptions rx
      WHERE rx.pharmacy_facility_id IN (${placeholders})`,
    facilityIds
  );

  const [[{ pending }]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS pending
       FROM prescriptions rx
      WHERE rx.status = 'ACTIVE'
        AND rx.pharmacy_facility_id IN (${placeholders})`,
    facilityIds
  );

  const [[{ dispensed_today }]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS dispensed_today
       FROM prescriptions rx
      WHERE rx.status = 'DISPENSED'
        AND DATE(rx.dispensed_at) = CURDATE()
        AND rx.pharmacy_facility_id IN (${placeholders})`,
    facilityIds
  );

  /* "pending refills" for a pharmacy means refills the doctor already
     APPROVED that are now waiting to be dispensed. PENDING ones are still
     with the doctor and not actionable by the pharmacy. We also include
     unrouted (NULL) prescriptions to mirror the list scope. */
  const [[{ pending_refills }]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS pending_refills
       FROM refill_requests rr
       JOIN prescriptions   rx ON rr.prescription_id = rx.id
      WHERE rr.status = 'APPROVED'
        AND (rx.pharmacy_facility_id IN (${placeholders})
             OR rx.pharmacy_facility_id IS NULL)`,
    facilityIds
  );

  return {
    totalPrescriptions: Number(total) || 0,
    pendingPrescriptions: Number(pending) || 0,
    dispensedToday: Number(dispensed_today) || 0,
    pendingRefills: Number(pending_refills) || 0,
    assigned: true as const,
  };
};

/* ------------------------------------------------------------------
   PHARMACY IDENTITY  (Sprint 12)
   Returns the user row plus the pharmacy facilities they staff,
   with a best-effort hospital affiliation for the dashboard header.
-------------------------------------------------------------------*/
export const getPharmacyMeService = async (userId: string) => {
  const [userRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, email, role, approval_status, is_active, created_at
       FROM users WHERE id = ?`,
    [userId]
  );
  if (userRows.length === 0) {
    throw new Error("Account not found");
  }
  const facilities = await getPharmacistFacilities(userId);

  return {
    ...userRows[0],
    facilities,
    primaryFacility: facilities[0] ?? null,
  };
};

/* ------------------------------------------------------------------
   LIST PRESCRIPTIONS (pharmacy view: all + filters)
-------------------------------------------------------------------*/
export interface PrescriptionListFilters {
  search?: string;
  status?: string;
  patientId?: string;
  providerId?: string;
  /**
   * Sprint 12 — when set, restricts results to prescriptions routed to
   * one of these pharmacy facilities. Callers acting on behalf of a
   * pharmacy user MUST set this (use [] to express "no assignment",
   * which deliberately returns zero rows).
   */
  pharmacyFacilityIds?: string[];
  page?: number;
  limit?: number;
}

const buildPrescriptionQuery = (
  where: string[],
  params: unknown[],
  limitOffset: string
) => `
  SELECT
    rx.id,
    rx.encounter_id,
    rx.patient_id,
    rx.medication_id,
    rx.dose,
    rx.frequency,
    rx.duration_days,
    rx.refills_allowed,
    rx.refills_used,
    rx.instructions,
    rx.prescribed_at,
    rx.status,
    rx.amount,
    rx.payment_status,
    rx.paid_at,
    rx.dispensed_at,
    rx.dispensed_by,
    rx.pharmacy_facility_id,
    phf.name        AS pharmacy_facility_name,
    pat.first_name,
    pat.last_name,
    pat.mrn,
    med.name        AS medication_name,
    med.generic_name AS medication_generic,
    pm.price        AS catalog_price,
    e.provider_id,
    prov.name       AS provider_name
  FROM prescriptions rx
  LEFT JOIN patients     pat  ON rx.patient_id = pat.id
  LEFT JOIN medications  med  ON rx.medication_id = med.id
  LEFT JOIN encounters   e    ON rx.encounter_id = e.id
  LEFT JOIN providers    prov ON e.provider_id = prov.id
  LEFT JOIN facilities   phf  ON phf.id = rx.pharmacy_facility_id
  LEFT JOIN pharmacy_medicines pm
         ON pm.medication_id = rx.medication_id
        AND pm.pharmacy_facility_id = rx.pharmacy_facility_id
        AND pm.is_active = 1
  ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
  ORDER BY rx.prescribed_at DESC
  ${limitOffset}
`;

export const listPrescriptionsService = async (
  filters: PrescriptionListFilters = {}
) => {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push(
      "(pat.first_name LIKE ? OR pat.last_name LIKE ? OR pat.mrn LIKE ? OR med.name LIKE ? OR med.generic_name LIKE ?)"
    );
    const t = `%${filters.search}%`;
    params.push(t, t, t, t, t);
  }
  if (
    filters.status &&
    (VALID_STATUSES as readonly string[]).includes(filters.status)
  ) {
    where.push("rx.status = ?");
    params.push(filters.status);
  }
  if (filters.patientId) {
    where.push("rx.patient_id = ?");
    params.push(filters.patientId);
  }
  if (filters.providerId) {
    where.push("e.provider_id = ?");
    params.push(filters.providerId);
  }
  if (filters.pharmacyFacilityIds !== undefined) {
    const scope = facilityScope(filters.pharmacyFacilityIds);
    where.push(scope.sql);
    params.push(...scope.params);
  }

  const { page, limit, offset } = clampPagination(
    filters.page,
    filters.limit
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    buildPrescriptionQuery(
      where,
      params,
      `LIMIT ${limit} OFFSET ${offset}`
    ),
    params
  );

  /* Fallback price book for unrouted prescriptions when a pharmacist views. */
  const fallbackBook =
    filters.pharmacyFacilityIds && filters.pharmacyFacilityIds.length
      ? await buildPharmacyPriceBook(filters.pharmacyFacilityIds)
      : null;

  for (const row of rows) {
    let price = computeRxPrice(row);
    if (price == null && fallbackBook && row.pharmacy_facility_id == null) {
      const fb = fallbackBook.get(row.medication_id);
      if (fb != null) price = fb;
    }
    row.price = price;
  }

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM prescriptions rx
    LEFT JOIN patients pat   ON rx.patient_id = pat.id
    LEFT JOIN medications med ON rx.medication_id = med.id
    LEFT JOIN encounters e    ON rx.encounter_id = e.id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
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

/* ------------------------------------------------------------------
   GET ONE PRESCRIPTION (full detail)
   Sprint 12: pharmacyFacilityIds enforces facility ownership.
-------------------------------------------------------------------*/
export const getPrescriptionByIdService = async (
  id: string,
  pharmacyFacilityIds?: string[]
) => {
  const where: string[] = ["rx.id = ?"];
  const params: unknown[] = [id];

  if (pharmacyFacilityIds !== undefined) {
    const scope = facilityScope(pharmacyFacilityIds);
    where.push(scope.sql);
    params.push(...scope.params);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    buildPrescriptionQuery(where, params, "LIMIT 1"),
    params
  );

  if (rows.length === 0) {
    /* When the pharmacy scope is enabled we cannot tell the caller
       whether the rx truly doesn't exist or whether it belongs to a
       different pharmacy — surface as 403 in the controller. */
    if (pharmacyFacilityIds !== undefined) {
      throw new PharmacyForbiddenError(
        "This prescription is not routed to your pharmacy"
      );
    }
    throw new Error("Prescription not found");
  }

  const rx = rows[0];
  rx.price = computeRxPrice(rx);
  if (rx.price == null && pharmacyFacilityIds && rx.pharmacy_facility_id == null) {
    const fb = await buildPharmacyPriceBook(pharmacyFacilityIds);
    const p = fb.get(rx.medication_id);
    if (p != null) rx.price = p;
  }

  /* recent refill history for this prescription */
  const [refills] = await pool.query<RowDataPacket[]>(
    `
    SELECT id, status, requested_at, decided_at, decided_by
    FROM refill_requests
    WHERE prescription_id = ?
    ORDER BY requested_at DESC
    `,
    [id]
  );

  return { ...rx, refills };
};

/* ------------------------------------------------------------------
   DISPENSE  (Sprint 12: 403 unless prescription is routed here)
-------------------------------------------------------------------*/
export const dispensePrescriptionService = async (
  prescriptionId: string,
  pharmacyUserId: string,
  actor?: ActorContext
) => {
  const [rxRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, status, pharmacy_facility_id
       FROM prescriptions WHERE id = ?`,
    [prescriptionId]
  );
  if (rxRows.length === 0) {
    throw new Error("Prescription not found");
  }

  const rx = rxRows[0];

  const ok = await pharmacistOwnsPrescription(
    pharmacyUserId,
    prescriptionId
  );
  if (!ok) {
    /* Log the denied attempt so admins can see cross-facility probes */
    await writeAuditLog({
      actorId: actor?.actorId ?? pharmacyUserId,
      actorRole: actor?.actorRole ?? "PHARMACY",
      action: "PRESCRIPTION_DISPENSE_DENIED",
      resourceType: "prescription",
      resourceId: prescriptionId,
      ip: actor?.ip ?? null,
      userAgent: actor?.userAgent ?? null,
      success: false,
      reason: `pharmacy_facility=${rx.pharmacy_facility_id ?? "unrouted"}`,
    });
    throw new PharmacyForbiddenError(
      "This prescription is not routed to your pharmacy"
    );
  }

  if (rx.status !== "ACTIVE") {
    throw new Error(
      `Cannot dispense — prescription is ${rx.status}`
    );
  }

  await pool.query(
    `
    UPDATE prescriptions
       SET status = 'DISPENSED',
           dispensed_at = NOW(),
           dispensed_by = ?
     WHERE id = ?
    `,
    [pharmacyUserId, prescriptionId]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? pharmacyUserId,
    actorRole: actor?.actorRole ?? "PHARMACY",
    action: "DISPENSED",
    resourceType: "prescription",
    resourceId: prescriptionId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `pharmacy_facility=${rx.pharmacy_facility_id}`,
  });

  return { success: true, status: "DISPENSED" as RxStatus };
};

/* ------------------------------------------------------------------
   REFILL REQUESTS
-------------------------------------------------------------------*/
export interface RefillListFilters {
  search?: string;
  status?: string;
  /** Sprint 12 — same semantics as PrescriptionListFilters.pharmacyFacilityIds */
  pharmacyFacilityIds?: string[];
  page?: number;
  limit?: number;
}

export const listRefillRequestsService = async (
  filters: RefillListFilters = {}
) => {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    where.push("rr.status = ?");
    params.push(filters.status);
  }
  if (filters.search) {
    where.push(
      "(pat.first_name LIKE ? OR pat.last_name LIKE ? OR pat.mrn LIKE ? OR med.name LIKE ?)"
    );
    const t = `%${filters.search}%`;
    params.push(t, t, t, t);
  }
  if (filters.pharmacyFacilityIds !== undefined) {
    const scope = facilityScope(filters.pharmacyFacilityIds);
    where.push(scope.sql);
    params.push(...scope.params);
  }

  const { page, limit, offset } = clampPagination(
    filters.page,
    filters.limit
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      rr.id,
      rr.prescription_id,
      rr.status,
      rr.requested_at,
      rr.decided_at,
      rr.decided_by,
      rx.patient_id,
      rx.medication_id,
      rx.dose,
      rx.frequency,
      rx.refills_allowed,
      rx.refills_used,
      pat.first_name,
      pat.last_name,
      pat.mrn,
      med.name AS medication_name,
      med.generic_name AS medication_generic
    FROM refill_requests rr
    JOIN prescriptions rx ON rr.prescription_id = rx.id
    LEFT JOIN patients pat ON rx.patient_id = pat.id
    LEFT JOIN medications med ON rx.medication_id = med.id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY rr.requested_at DESC
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM refill_requests rr
    JOIN prescriptions rx ON rr.prescription_id = rx.id
    LEFT JOIN patients pat ON rx.patient_id = pat.id
    LEFT JOIN medications med ON rx.medication_id = med.id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
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

/**
 * Pharmacy dispenses a refill that the DOCTOR has already approved.
 * Flow: patient requests -> doctor APPROVES -> pharmacy DISPENSES (here).
 * The pharmacy no longer approves/rejects refills; it only fulfils ones the
 * prescriber authorised. Consumes one refill (increments refills_used) and
 * marks the refill request DISPENSED.
 */
export const dispenseRefillRequestService = async (
  refillId: string,
  pharmacyUserId: string,
  actor?: ActorContext
) => {
  const [rrRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT rr.id, rr.status, rr.prescription_id,
           rx.refills_allowed, rx.refills_used,
           rx.pharmacy_facility_id
    FROM refill_requests rr
    JOIN prescriptions rx ON rr.prescription_id = rx.id
    WHERE rr.id = ?
    `,
    [refillId]
  );
  if (rrRows.length === 0) {
    throw new Error("Refill request not found");
  }
  const rr = rrRows[0];

  /* Facility ownership gate */
  const ok = await pharmacistOwnsRefill(pharmacyUserId, refillId);
  if (!ok) {
    await writeAuditLog({
      actorId: actor?.actorId ?? pharmacyUserId,
      actorRole: actor?.actorRole ?? "PHARMACY",
      action: "REFILL_DISPENSE_DENIED",
      resourceType: "refill_request",
      resourceId: refillId,
      ip: actor?.ip ?? null,
      userAgent: actor?.userAgent ?? null,
      success: false,
      reason: `pharmacy_facility=${rr.pharmacy_facility_id ?? "unrouted"}`,
    });
    throw new PharmacyForbiddenError(
      "This refill request is not routed to your pharmacy"
    );
  }

  if (rr.status === "PENDING") {
    throw new Error(
      "This refill is still awaiting the doctor's approval"
    );
  }
  if (rr.status !== "APPROVED") {
    throw new Error(`Cannot dispense — refill is ${rr.status}`);
  }

  await pool.query(
    `UPDATE prescriptions
       SET refills_used = COALESCE(refills_used, 0) + 1,
           dispensed_at = NOW(),
           dispensed_by = ?
     WHERE id = ?`,
    [pharmacyUserId, rr.prescription_id]
  );

  await pool.query(
    `UPDATE refill_requests
       SET status = 'DISPENSED', decided_at = NOW(), decided_by = ?
     WHERE id = ?`,
    [pharmacyUserId, refillId]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? pharmacyUserId,
    actorRole: actor?.actorRole ?? "PHARMACY",
    action: "REFILL_DISPENSED",
    resourceType: "refill_request",
    resourceId: refillId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `prescription=${rr.prescription_id}; pharmacy_facility=${rr.pharmacy_facility_id}`,
  });

  /* Best-effort patient notification. */
  try {
    const [ptRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT pt.user_id, m.name AS medication_name
        FROM prescriptions rx
        JOIN patients pt ON rx.patient_id = pt.id
        LEFT JOIN medications m ON rx.medication_id = m.id
       WHERE rx.id = ?
      `,
      [rr.prescription_id]
    );
    const pt = ptRows[0];
    if (pt?.user_id) {
      const med = pt.medication_name ? ` for ${pt.medication_name}` : "";
      await createNotification({
        userId: pt.user_id,
        type: "REFILL_DISPENSED",
        title: "Refill dispensed",
        body: `Your refill${med} has been dispensed by the pharmacy.`,
        link: "/patient/refill-requests",
      });
    }
  } catch (err) {
    logger.error("Failed to create refill notification:", err);
  }

  return { success: true, status: "DISPENSED" as const };
};

/* ------------------------------------------------------------------
   PATIENT — list / request refill
-------------------------------------------------------------------*/
const requirePatientByUser = async (userId: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, first_name, last_name FROM patients WHERE user_id = ?`,
    [userId]
  );
  if (rows.length === 0) {
    throw new Error("Patient not found");
  }
  return rows[0];
};

export const getPatientPrescriptionsService = async (
  userId: string
) => {
  const patient = await requirePatientByUser(userId);

  const result = await listPrescriptionsService({
    patientId: patient.id,
    limit: 100
  });

  return result.data;
};

export const requestRefillService = async (
  userId: string,
  prescriptionId: string,
  actor?: ActorContext
) => {
  const patient = await requirePatientByUser(userId);

  const [rxRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, patient_id, refills_allowed, refills_used, status
       FROM prescriptions WHERE id = ?`,
    [prescriptionId]
  );
  if (rxRows.length === 0) {
    throw new Error("Prescription not found");
  }
  const rx = rxRows[0];
  if (rx.patient_id !== patient.id) {
    throw new Error("This prescription does not belong to you");
  }

  /* The prescriber authorises each refill on approval, so we don't gate the
     request on a pre-set refills_allowed count. */

  const [pendingRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM refill_requests
       WHERE prescription_id = ? AND status IN ('PENDING','APPROVED')`,
    [prescriptionId]
  );
  if (pendingRows.length > 0) {
    throw new Error(
      "A refill request is already in progress for this prescription"
    );
  }

  const id = uuid();
  await pool.query(
    `INSERT INTO refill_requests (id, prescription_id, status, requested_at)
     VALUES (?, ?, 'PENDING', NOW())`,
    [id, prescriptionId]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? userId,
    actorRole: actor?.actorRole ?? "PATIENT",
    action: "REFILL_REQUESTED",
    resourceType: "refill_request",
    resourceId: id,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `prescription=${prescriptionId}`
  });

  return { success: true, refillRequestId: id };
};

/* ------------------------------------------------------------------
   PHARMACY MEDICINE CATALOGUE  (per-facility prices)
-------------------------------------------------------------------*/
const resolvePharmacyFacility = async (userId: string): Promise<string> => {
  const ids = await getPharmacistFacilityIds(userId);
  if (ids.length === 0) {
    throw new Error(
      "Your account is not assigned to a pharmacy. Ask your hospital admin to link you."
    );
  }
  return ids[0];
};

export const listPharmacyMedicinesService = async (userId: string) => {
  const facilityId = await resolvePharmacyFacility(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT pm.id, pm.medication_id, pm.price, pm.quantity, pm.is_active, pm.created_at,
           med.name AS medication_name, med.generic_name AS medication_generic
      FROM pharmacy_medicines pm
      JOIN medications med ON med.id = pm.medication_id
     WHERE pm.pharmacy_facility_id = ?
     ORDER BY med.name
    `,
    [facilityId]
  );
  return rows;
};

/** Find an existing medication by name (case-insensitive) or create one. */
const findOrCreateMedication = async (name: string): Promise<string> => {
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM medications WHERE name = ? LIMIT 1`,
    [name]
  );
  if (existing.length > 0) return existing[0].id;

  const id = uuid();
  await pool.query(
    `INSERT INTO medications (id, name) VALUES (?, ?)`,
    [id, name]
  );
  return id;
};

export const addPharmacyMedicineService = async (
  userId: string,
  input: { name?: string; price?: number; quantity?: number }
) => {
  const facilityId = await resolvePharmacyFacility(userId);
  const name = (input.name || "").trim();
  if (!name) throw new Error("Medicine name is required");

  const price = Math.round(Number(input.price ?? 0) * 100) / 100;
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be a non-negative number");
  }
  const quantity = Math.trunc(Number(input.quantity ?? 0));
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative number");
  }

  const medicationId = await findOrCreateMedication(name);

  const [dup] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM pharmacy_medicines
      WHERE pharmacy_facility_id = ? AND medication_id = ? LIMIT 1`,
    [facilityId, medicationId]
  );
  if (dup.length > 0) {
    throw new Error("This medicine is already in your catalogue");
  }

  const id = uuid();
  await pool.query(
    `INSERT INTO pharmacy_medicines (id, pharmacy_facility_id, medication_id, price, quantity)
     VALUES (?, ?, ?, ?, ?)`,
    [id, facilityId, medicationId, price, quantity]
  );
  return { id, medication_id: medicationId, name, price, quantity };
};

export const updatePharmacyMedicineService = async (
  userId: string,
  itemId: string,
  input: { price?: number; quantity?: number; is_active?: boolean }
) => {
  const facilityId = await resolvePharmacyFacility(userId);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM pharmacy_medicines WHERE id = ? AND pharmacy_facility_id = ?`,
    [itemId, facilityId]
  );
  if (rows.length === 0) throw new Error("Catalogue item not found");

  const sets: string[] = [];
  const params: unknown[] = [];
  if (input.price !== undefined) {
    const price = Math.round(Number(input.price) * 100) / 100;
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Price must be a non-negative number");
    }
    sets.push("price = ?");
    params.push(price);
  }
  if (input.quantity !== undefined) {
    const quantity = Math.trunc(Number(input.quantity));
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error("Quantity must be a non-negative number");
    }
    sets.push("quantity = ?");
    params.push(quantity);
  }
  if (input.is_active !== undefined) {
    sets.push("is_active = ?");
    params.push(input.is_active ? 1 : 0);
  }
  if (sets.length === 0) throw new Error("Nothing to update");

  params.push(itemId, facilityId);
  await pool.query(
    `UPDATE pharmacy_medicines SET ${sets.join(", ")}
      WHERE id = ? AND pharmacy_facility_id = ?`,
    params
  );
  return { id: itemId };
};

export const deletePharmacyMedicineService = async (
  userId: string,
  itemId: string
) => {
  const facilityId = await resolvePharmacyFacility(userId);
  const [res] = await pool.query<ResultSetHeader>(
    `DELETE FROM pharmacy_medicines WHERE id = ? AND pharmacy_facility_id = ?`,
    [itemId, facilityId]
  );
  if (res.affectedRows === 0) throw new Error("Catalogue item not found");
  return { success: true };
};

/**
 * Pharmacy records that the patient has paid for a prescription. Snapshots
 * the catalogue price so it counts towards pharmacy earnings in the hospital
 * + patient billing views. Routes the prescription to the acting pharmacy if
 * it was not routed yet.
 */
export const markPrescriptionPaidService = async (
  prescriptionId: string,
  pharmacyUserId: string
) => {
  const ok = await pharmacistOwnsPrescription(pharmacyUserId, prescriptionId);
  if (!ok) {
    throw new PharmacyForbiddenError(
      "This prescription is not routed to your pharmacy"
    );
  }

  const [rxRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, medication_id, pharmacy_facility_id, payment_status
       FROM prescriptions WHERE id = ?`,
    [prescriptionId]
  );
  if (rxRows.length === 0) throw new Error("Prescription not found");
  const rx = rxRows[0];
  if (rx.payment_status === "PAID") {
    throw new Error("This prescription is already paid");
  }

  /* Determine the facility this sale belongs to. */
  let facilityId: string | null = rx.pharmacy_facility_id;
  if (!facilityId) {
    facilityId = await resolvePharmacyFacility(pharmacyUserId);
  }

  const [priceRows] = await pool.query<RowDataPacket[]>(
    `SELECT price FROM pharmacy_medicines
      WHERE pharmacy_facility_id = ? AND medication_id = ? AND is_active = 1
      LIMIT 1`,
    [facilityId, rx.medication_id]
  );
  if (priceRows.length === 0) {
    throw new Error(
      "Set a price for this medicine in your catalogue before marking it paid"
    );
  }
  const amount = Math.round(Number(priceRows[0].price) * 100) / 100;

  await pool.query(
    `UPDATE prescriptions
        SET amount = ?, payment_status = 'PAID', paid_at = NOW(),
            pharmacy_facility_id = COALESCE(pharmacy_facility_id, ?)
      WHERE id = ?`,
    [amount, facilityId, prescriptionId]
  );

  return { success: true, amount, payment_status: "PAID" as const };
};

/* ------------------------------------------------------------------
   PROVIDER — list prescriptions I created
-------------------------------------------------------------------*/
export const getProviderPrescriptionsService = async (
  userId: string,
  filters: PrescriptionListFilters = {}
) => {
  const [provRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM providers WHERE user_id = ?`,
    [userId]
  );
  if (provRows.length === 0) {
    throw new Error("Provider not found");
  }

  return listPrescriptionsService({
    ...filters,
    providerId: provRows[0].id
  });
};
