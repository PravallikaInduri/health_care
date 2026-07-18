import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import {
  getPatientIdByUser,
  getProviderIdByUser
} from "../utils/identity";
import { writeAuditLog } from "./auditService";
import { ActorContext } from "../utils/auditContext";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Generate a bill from a completed encounter. Callable by the provider who
 * owns the encounter or by an admin. Prevents duplicate bills per encounter.
 */
export const generateBillFromEncounterService = async (
  userId: string,
  role: string,
  encounterId: string,
  data: { subtotal?: number; insurance_pay?: number },
  actor?: ActorContext
) => {
  const [encRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT e.id, e.patient_id, e.provider_id
    FROM encounters e
    WHERE e.id = ?
    `,
    [encounterId]
  );

  if (encRows.length === 0) {
    throw new Error("Encounter not found");
  }

  const encounter = encRows[0];

  /* Authorisation: admin OR the owning provider */
  if (role !== "ADMIN") {
    const providerId = await getProviderIdByUser(userId);
    if (!providerId || providerId !== encounter.provider_id) {
      throw new Error("Forbidden");
    }
  }

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM bills WHERE encounter_id = ?`,
    [encounterId]
  );
  if (existing.length > 0) {
    throw new Error("A bill already exists for this encounter");
  }

  const subtotal = round2(Number(data.subtotal) || 0);
  if (subtotal <= 0) {
    throw new Error("subtotal must be greater than 0");
  }

  const insurancePay = round2(
    Math.min(Number(data.insurance_pay) || 0, subtotal)
  );
  const patientPay = round2(subtotal - insurancePay);

  const id = uuid();

  await pool.query(
    `
    INSERT INTO bills
      (id, encounter_id, patient_id, subtotal, insurance_pay, patient_pay, status, generated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'UNPAID', NOW())
    `,
    [
      id,
      encounterId,
      encounter.patient_id,
      subtotal,
      insurancePay,
      patientPay
    ]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? userId,
    actorRole: actor?.actorRole ?? role,
    action: "BILL_GENERATED",
    resourceType: "bill",
    resourceId: id,
    patientId: encounter.patient_id,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: null
  });

  return { id };
};

/**
 * List the current patient's bills with the amount paid so far.
 */
export const listPatientBillsService = async (userId: string) => {
  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      b.id,
      b.encounter_id,
      b.subtotal,
      b.insurance_pay,
      b.patient_pay,
      b.status,
      b.generated_at,
      prov.name AS provider_name,
      (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        WHERE p.bill_id = b.id AND p.status = 'SUCCESS'
      ) AS amount_paid
    FROM bills b
    LEFT JOIN encounters e ON b.encounter_id = e.id
    LEFT JOIN providers prov ON e.provider_id = prov.id
    WHERE b.patient_id = ?
    ORDER BY b.generated_at DESC
    `,
    [patientId]
  );

  return rows;
};

/**
 * List the patient's appointment payments (consultation fees) so they appear
 * alongside encounter bills in the billing page. These are paid during the
 * booking flow; here we surface them as billing line items.
 */
export const listPatientAppointmentPaymentsService = async (
  userId: string
) => {
  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      a.id,
      a.scheduled_at,
      a.consultation_fee,
      a.payment_status,
      a.paid_at,
      pr.name AS provider_name,
      f.name  AS facility_name,
      (
        SELECT p.gateway_txn_id FROM payments p
         WHERE p.appointment_id = a.id AND p.status = 'SUCCESS'
         ORDER BY p.paid_at DESC LIMIT 1
      ) AS gateway_txn_id,
      (
        SELECT COALESCE(SUM(p.amount), 0) FROM payments p
         WHERE p.appointment_id = a.id AND p.status = 'SUCCESS'
      ) AS amount_paid
    FROM appointments a
    JOIN providers pr ON pr.id = a.provider_id
    LEFT JOIN facilities f ON f.id = a.facility_id
    WHERE a.patient_id = ?
      AND a.consultation_fee IS NOT NULL
      AND a.consultation_fee > 0
    ORDER BY a.scheduled_at DESC
    `,
    [patientId]
  );

  return rows;
};

/**
 * List the patient's paid lab charges (what they spent at labs). Surfaced in
 * the billing page under the "Labs" filter.
 */
export const listPatientLabChargesService = async (userId: string) => {
  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      lo.id,
      lo.paid_at,
      lo.amount,
      lo.status,
      lab.name AS lab_name,
      (
        SELECT GROUP_CONCAT(t.test_name SEPARATOR ', ')
          FROM lab_order_tests t WHERE t.lab_order_id = lo.id
      ) AS tests
    FROM lab_orders lo
    LEFT JOIN facilities lab ON lab.id = lo.lab_facility_id
    WHERE lo.patient_id = ?
      AND lo.payment_status = 'PAID'
    ORDER BY lo.paid_at DESC
    `,
    [patientId]
  );

  return rows;
};

/**
 * List the patient's paid pharmacy charges (what they spent at pharmacies).
 * Surfaced in the billing page under the "Pharmacy" filter.
 */
export const listPatientPharmacyChargesService = async (userId: string) => {
  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      rx.id,
      rx.paid_at,
      rx.amount,
      rx.dose,
      rx.frequency,
      med.name AS medication_name,
      ph.name  AS pharmacy_name
    FROM prescriptions rx
    LEFT JOIN medications med ON med.id = rx.medication_id
    LEFT JOIN facilities ph ON ph.id = rx.pharmacy_facility_id
    WHERE rx.patient_id = ?
      AND rx.payment_status = 'PAID'
    ORDER BY rx.paid_at DESC
    `,
    [patientId]
  );

  return rows;
};

/**
 * Patient bill detail including its payment history.
 */
export const getPatientBillService = async (
  userId: string,
  billId: string
) => {
  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      b.*,
      prov.name AS provider_name
    FROM bills b
    LEFT JOIN encounters e ON b.encounter_id = e.id
    LEFT JOIN providers prov ON e.provider_id = prov.id
    WHERE b.id = ? AND b.patient_id = ?
    `,
    [billId, patientId]
  );

  if (rows.length === 0) {
    throw new Error("Bill not found");
  }

  const [payments] = await pool.query<RowDataPacket[]>(
    `
    SELECT id, gateway, gateway_txn_id, amount, status, paid_at
    FROM payments
    WHERE bill_id = ?
    ORDER BY paid_at DESC
    `,
    [billId]
  );

  return { ...rows[0], payments };
};

/**
 * Simulate an online payment against a bill. A real integration would create a
 * pending payment, redirect to a gateway and reconcile via webhook; here we
 * record a successful payment immediately and update the bill status.
 */
export const payBillService = async (
  userId: string,
  billId: string,
  data: { amount?: number; gateway?: string },
  actor?: ActorContext
) => {
  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }

  const [billRows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM bills WHERE id = ? AND patient_id = ?`,
    [billId, patientId]
  );

  if (billRows.length === 0) {
    throw new Error("Bill not found");
  }

  const bill = billRows[0];

  if (bill.status === "PAID") {
    throw new Error("This bill is already fully paid");
  }

  const [paidRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT COALESCE(SUM(amount), 0) AS paid
    FROM payments
    WHERE bill_id = ? AND status = 'SUCCESS'
    `,
    [billId]
  );

  const alreadyPaid = Number(paidRows[0].paid) || 0;
  const due = round2(Number(bill.patient_pay) - alreadyPaid);

  if (due <= 0) {
    throw new Error("Nothing left to pay on this bill");
  }

  const amount = round2(
    data.amount !== undefined ? Number(data.amount) : due
  );

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }
  if (amount > due) {
    throw new Error("Payment exceeds the outstanding balance");
  }

  const paymentId = uuid();
  const txnId = `TXN-${uuid().slice(0, 12).toUpperCase()}`;

  await pool.query(
    `
    INSERT INTO payments
      (id, bill_id, gateway, gateway_txn_id, amount, status, paid_at)
    VALUES (?, ?, ?, ?, ?, 'SUCCESS', NOW())
    `,
    [
      paymentId,
      billId,
      data.gateway || "MOCK_GATEWAY",
      txnId,
      amount
    ]
  );

  const newPaid = round2(alreadyPaid + amount);
  const newStatus =
    newPaid >= Number(bill.patient_pay) ? "PAID" : "PARTIAL";

  await pool.query(
    `UPDATE bills SET status = ? WHERE id = ?`,
    [newStatus, billId]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? userId,
    actorRole: actor?.actorRole ?? "PATIENT",
    action: "BILL_PAYMENT",
    resourceType: "bill",
    resourceId: billId,
    patientId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `amount=${amount}`
  });

  return {
    paymentId,
    gateway_txn_id: txnId,
    amount,
    billStatus: newStatus
  };
};
