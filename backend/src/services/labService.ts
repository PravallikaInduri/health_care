import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";

const VALID_STATUSES = [
  "ORDERED",
  "RECEIVED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;
type LabStatus = (typeof VALID_STATUSES)[number];

/**
 * Resolve the LAB facility a user staffs (staff_role = 'LAB_TECH').
 */
export const resolveLabForUser = async (
  userId: string
): Promise<{ id: string; name: string; hospital_name: string | null } | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT f.id, f.name, ph.name AS hospital_name
      FROM facility_staff fs
      JOIN facilities f ON f.id = fs.facility_id
      LEFT JOIN facilities ph ON ph.id = f.parent_facility_id
     WHERE fs.user_id = ?
       AND fs.staff_role IN ('LAB_TECH','LAB_ADMIN')
       AND f.type = 'LAB'
     LIMIT 1
    `,
    [userId]
  );
  return rows.length
    ? (rows[0] as { id: string; name: string; hospital_name: string | null })
    : null;
};

const requireLab = async (userId: string) => {
  const lab = await resolveLabForUser(userId);
  if (!lab) {
    throw new Error("No lab is associated with this account");
  }
  return lab;
};

export const getLabMeService = async (userId: string) => {
  const lab = await requireLab(userId);

  const [[counts]] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status IN ('ORDERED','RECEIVED','IN_PROGRESS') THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed
    FROM lab_orders
    WHERE lab_facility_id = ?
    `,
    [lab.id]
  );

  const [[reportCounts]] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      COUNT(DISTINCT lo.id) AS total_tests,
      SUM(CASE WHEN lr.status IN ('PENDING','SAMPLE_COLLECTED','PROCESSING') THEN 1 ELSE 0 END) AS pending_reports,
      SUM(CASE WHEN lr.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_reports,
      SUM(CASE WHEN lr.status = 'UPLOADED' AND DATE(lr.uploaded_at) = CURDATE() THEN 1 ELSE 0 END) AS uploaded_today,
      COUNT(DISTINCT lr.patient_id) AS patients_tested
    FROM lab_orders lo
    LEFT JOIN lab_reports lr ON lr.lab_order_id = lo.id
    WHERE lo.lab_facility_id = ?
    `,
    [lab.id]
  );

  return {
    lab,
    counts: {
      total: Number(counts.total ?? 0),
      pending: Number(counts.pending ?? 0),
      completed: Number(counts.completed ?? 0),
      totalTests: Number(reportCounts.total_tests ?? 0),
      pendingReports: Number(reportCounts.pending_reports ?? 0),
      completedReports: Number(reportCounts.completed_reports ?? 0),
      uploadedToday: Number(reportCounts.uploaded_today ?? 0),
      patientsTested: Number(reportCounts.patients_tested ?? 0),
    },
  };
};

export const getLabOrdersService = async (
  userId: string,
  status?: string
) => {
  const lab = await requireLab(userId);

  const params: unknown[] = [lab.id];
  let sql = `
    SELECT
      lo.id,
      lo.ordered_at,
      lo.status,
      lo.amount,
      lo.payment_status,
      lo.paid_at,
      pat.first_name,
      pat.last_name,
      pat.mrn,
      prov.name AS provider_name
    FROM lab_orders lo
    LEFT JOIN patients pat ON lo.patient_id = pat.id
    LEFT JOIN encounters e ON lo.encounter_id = e.id
    LEFT JOIN providers prov ON e.provider_id = prov.id
    WHERE lo.lab_facility_id = ?
  `;
  if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
    sql += ` AND lo.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY lo.ordered_at DESC`;

  const [orders] = await pool.query<RowDataPacket[]>(sql, params);

  /* Price book for this lab: lower(name) -> price */
  const priceBook = await getLabPriceBook(lab.id);

  for (const order of orders) {
    const [tests] = await pool.query<RowDataPacket[]>(
      `SELECT id, test_name, instructions FROM lab_order_tests
        WHERE lab_order_id = ? ORDER BY created_at ASC`,
      [order.id]
    );
    const [uploads] = await pool.query<RowDataPacket[]>(
      `SELECT id, test_name, file_name, mime, note, uploaded_at,
              OCTET_LENGTH(file_data) AS size_bytes
         FROM lab_order_results
        WHERE lab_order_id = ?
        ORDER BY uploaded_at DESC`,
      [order.id]
    );

    let computedTotal = 0;
    for (const t of tests) {
      const price = priceBook.get((t.test_name || "").trim().toLowerCase());
      t.price = price ?? null;
      if (price != null) computedTotal += Number(price);
    }

    order.tests = tests;
    order.uploads = uploads;
    /* When already paid, show the snapshotted amount; otherwise the live
       computed total from the current price book. */
    order.total =
      order.payment_status === "PAID" && order.amount != null
        ? Number(order.amount)
        : computedTotal;
  }

  return orders;
};

/* ------------------------------------------------------------------
   LAB TEST CATALOGUE  (managed by the lab technician)
-------------------------------------------------------------------*/
const getLabPriceBook = async (labId: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT name, price FROM lab_tests
      WHERE lab_facility_id = ? AND is_active = 1`,
    [labId]
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(String(r.name).trim().toLowerCase(), Number(r.price));
  }
  return map;
};

export const listLabTestsService = async (userId: string) => {
  const lab = await requireLab(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, price, is_active, created_at
       FROM lab_tests WHERE lab_facility_id = ?
      ORDER BY name`,
    [lab.id]
  );
  return rows;
};

export const createLabTestService = async (
  userId: string,
  input: { name?: string; price?: number }
) => {
  const lab = await requireLab(userId);
  const name = (input.name || "").trim();
  if (!name) throw new Error("Test name is required");
  const price = Math.round(Number(input.price ?? 0) * 100) / 100;
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be a non-negative number");
  }

  const [dup] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM lab_tests WHERE lab_facility_id = ? AND name = ? LIMIT 1`,
    [lab.id, name]
  );
  if (dup.length > 0) {
    throw new Error("A test with this name already exists");
  }

  const id = uuid();
  await pool.query(
    `INSERT INTO lab_tests (id, lab_facility_id, name, price) VALUES (?, ?, ?, ?)`,
    [id, lab.id, name, price]
  );
  return { id, name, price };
};

export const updateLabTestService = async (
  userId: string,
  testId: string,
  input: { name?: string; price?: number; is_active?: boolean }
) => {
  const lab = await requireLab(userId);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM lab_tests WHERE id = ? AND lab_facility_id = ?`,
    [testId, lab.id]
  );
  if (rows.length === 0) throw new Error("Test not found");

  const sets: string[] = [];
  const params: unknown[] = [];
  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw new Error("Test name is required");
    sets.push("name = ?");
    params.push(name);
  }
  if (input.price !== undefined) {
    const price = Math.round(Number(input.price) * 100) / 100;
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Price must be a non-negative number");
    }
    sets.push("price = ?");
    params.push(price);
  }
  if (input.is_active !== undefined) {
    sets.push("is_active = ?");
    params.push(input.is_active ? 1 : 0);
  }
  if (sets.length === 0) throw new Error("Nothing to update");

  params.push(testId, lab.id);
  await pool.query(
    `UPDATE lab_tests SET ${sets.join(", ")} WHERE id = ? AND lab_facility_id = ?`,
    params
  );
  return { id: testId };
};

export const deleteLabTestService = async (
  userId: string,
  testId: string
) => {
  const lab = await requireLab(userId);
  const [res] = await pool.query<ResultSetHeader>(
    `DELETE FROM lab_tests WHERE id = ? AND lab_facility_id = ?`,
    [testId, lab.id]
  );
  if (res.affectedRows === 0) throw new Error("Test not found");
  return { success: true };
};

/**
 * Lab tech records that the patient has paid for an order. Snapshots the
 * total from the current price book and flags the order PAID so it counts
 * towards lab earnings in the hospital + patient billing views.
 */
export const markLabOrderPaidService = async (
  userId: string,
  orderId: string
) => {
  const lab = await requireLab(userId);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, payment_status FROM lab_orders
      WHERE id = ? AND lab_facility_id = ?`,
    [orderId, lab.id]
  );
  if (rows.length === 0) throw new Error("Lab order not found for this lab");
  if (rows[0].payment_status === "PAID") {
    throw new Error("This order is already paid");
  }

  const priceBook = await getLabPriceBook(lab.id);
  const [tests] = await pool.query<RowDataPacket[]>(
    `SELECT test_name FROM lab_order_tests WHERE lab_order_id = ?`,
    [orderId]
  );
  let total = 0;
  for (const t of tests) {
    const price = priceBook.get((t.test_name || "").trim().toLowerCase());
    if (price != null) total += Number(price);
  }
  total = Math.round(total * 100) / 100;

  await pool.query(
    `UPDATE lab_orders
        SET amount = ?, payment_status = 'PAID', paid_at = NOW()
      WHERE id = ? AND lab_facility_id = ?`,
    [total, orderId, lab.id]
  );

  return { success: true, amount: total, payment_status: "PAID" as const };
};

export const updateLabOrderStatusService = async (
  userId: string,
  orderId: string,
  status: string
) => {
  const lab = await requireLab(userId);

  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Invalid status");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM lab_orders WHERE id = ? AND lab_facility_id = ?`,
    [orderId, lab.id]
  );
  if (rows.length === 0) {
    throw new Error("Lab order not found for this lab");
  }

  await pool.query(
    `UPDATE lab_orders SET status = ? WHERE id = ? AND lab_facility_id = ?`,
    [status, orderId, lab.id]
  );
  return { success: true, status: status as LabStatus };
};

/**
 * Lab technician uploads a result file against an order routed to their lab.
 * Stored in `lab_order_results` (visible to the patient and the ordering
 * doctor). The order is marked COMPLETED once a result is uploaded.
 */
export const uploadLabResultService = async (
  userId: string,
  orderId: string,
  input: {
    fileName: string;
    mime: string;
    buffer: Buffer;
    testName?: string | null;
    note?: string | null;
  }
) => {
  const lab = await requireLab(userId);

  const [orderRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM lab_orders WHERE id = ? AND lab_facility_id = ?`,
    [orderId, lab.id]
  );
  if (orderRows.length === 0) {
    throw new Error("Lab order not found for this lab");
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
      orderId,
      input.testName || null,
      input.fileName,
      input.mime,
      input.buffer,
      input.note || null,
      userId,
    ]
  );

  await pool.query(
    `UPDATE lab_orders SET status = 'COMPLETED' WHERE id = ?`,
    [orderId]
  );

  return { id };
};

export const getLabResultFileService = async (
  userId: string,
  resultId: string
) => {
  const lab = await requireLab(userId);

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT r.file_name, r.mime, r.file_data
      FROM lab_order_results r
      JOIN lab_orders lo ON r.lab_order_id = lo.id
     WHERE r.id = ? AND lo.lab_facility_id = ?
    `,
    [resultId, lab.id]
  );
  if (rows.length === 0) {
    throw new Error("Result not found");
  }
  return rows[0];
};
