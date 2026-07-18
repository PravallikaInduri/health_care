import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import { writeAuditLog } from "./auditService";
import type { ActorContext } from "../utils/auditContext";
import { sendLabReportReadyEmail } from "../utils/mail";
import { logger } from "../utils/logger";
import type { UserRole } from "../types/auth";

export type LabReportStatus =
  | "PENDING"
  | "SAMPLE_COLLECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "UPLOADED";

const STATUSES: readonly LabReportStatus[] = [
  "PENDING",
  "SAMPLE_COLLECTED",
  "PROCESSING",
  "COMPLETED",
  "UPLOADED",
];

const normalizeStatus = (value?: string | null): LabReportStatus => {
  const normalized = String(value || "UPLOADED")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_") as LabReportStatus;
  if (!STATUSES.includes(normalized)) {
    throw new Error("Invalid report status");
  }
  return normalized;
};

const requirePdf = (mime: string, fileName: string) => {
  if (mime !== "application/pdf" && !fileName.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF lab reports can be uploaded");
  }
};

const resolveLabForUser = async (userId: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT f.id, f.name
      FROM facility_staff fs
      JOIN facilities f ON f.id = fs.facility_id
     WHERE fs.user_id = ?
       AND fs.staff_role IN ('LAB_TECH','LAB_ADMIN')
       AND f.type = 'LAB'
     LIMIT 1
    `,
    [userId]
  );
  if (rows.length === 0) throw new Error("No lab is associated with this account");
  return rows[0] as { id: string; name: string };
};

const patientName = (row: RowDataPacket) =>
  [row.first_name, row.last_name].filter(Boolean).join(" ") || "Patient";

const ensureProviderCanAccessPatient = async (
  userId: string,
  patientId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT 1
      FROM providers pr
      LEFT JOIN appointments a ON a.provider_id = pr.id AND a.patient_id = ?
      LEFT JOIN encounters e ON e.provider_id = pr.id AND e.patient_id = ?
     WHERE pr.user_id = ?
       AND (a.id IS NOT NULL OR e.id IS NOT NULL)
     LIMIT 1
    `,
    [patientId, patientId, userId]
  );
  if (rows.length === 0) throw new Error("Forbidden");
};

const ensurePatientCanAccess = async (userId: string, patientId: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM patients WHERE user_id = ? AND id = ? LIMIT 1`,
    [userId, patientId]
  );
  if (rows.length === 0) throw new Error("Forbidden");
};

const ensureHospitalCanAccess = async (userId: string, reportId: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT 1
      FROM lab_reports lr
      JOIN lab_orders lo ON lo.id = lr.lab_order_id
      JOIN facilities lab ON lab.id = lo.lab_facility_id
      JOIN facility_staff fs ON fs.facility_id = lab.parent_facility_id
     WHERE lr.id = ?
       AND fs.user_id = ?
       AND fs.staff_role = 'HOSPITAL_ADMIN'
     LIMIT 1
    `,
    [reportId, userId]
  );
  if (rows.length === 0) throw new Error("Forbidden");
};

const ensureLabCanAccess = async (userId: string, reportId: string) => {
  const lab = await resolveLabForUser(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT 1
      FROM lab_reports lr
      JOIN lab_orders lo ON lo.id = lr.lab_order_id
     WHERE lr.id = ?
       AND lo.lab_facility_id = ?
     LIMIT 1
    `,
    [reportId, lab.id]
  );
  if (rows.length === 0) throw new Error("Forbidden");
};

const reportSelect = `
  SELECT
    lr.id,
    lr.patient_id,
    lr.appointment_id,
    lr.encounter_id,
    lr.lab_test_id,
    lr.lab_order_id,
    lr.uploaded_by,
    lr.report_name,
    lr.report_file_url,
    lr.remarks,
    lr.status,
    lr.uploaded_at,
    lr.created_at,
    lr.updated_at,
    lt.name AS test_name,
    lab.name AS hospital_name,
    uploader.email AS uploaded_by_email,
    pat.first_name,
    pat.last_name,
    pat.email AS patient_email
`;

const reportJoins = `
  FROM lab_reports lr
  LEFT JOIN lab_tests lt ON lt.id = lr.lab_test_id
  LEFT JOIN lab_orders lo ON lo.id = lr.lab_order_id
  LEFT JOIN facilities lab ON lab.id = lo.lab_facility_id
  LEFT JOIN users uploader ON uploader.id = lr.uploaded_by
  LEFT JOIN patients pat ON pat.id = lr.patient_id
`;

export const uploadLabReportService = async (
  userId: string,
  input: {
    labOrderId?: string | null;
    patientId?: string | null;
    appointmentId?: string | null;
    encounterId?: string | null;
    labTestId?: string | null;
    reportName?: string | null;
    remarks?: string | null;
    status?: string | null;
    fileName: string;
    mime: string;
    buffer: Buffer;
  },
  actor?: ActorContext
) => {
  requirePdf(input.mime, input.fileName);
  const lab = await resolveLabForUser(userId);
  const status = normalizeStatus(input.status);
  let patientId = input.patientId || null;
  let appointmentId = input.appointmentId || null;
  let encounterId = input.encounterId || null;
  let labTestId = input.labTestId || null;
  let testName = input.reportName || input.fileName;

  if (input.labOrderId) {
    const [orders] = await pool.query<RowDataPacket[]>(
      `
      SELECT lo.id, lo.patient_id, lo.appointment_id, lo.encounter_id,
             lot.id AS lab_test_id, lot.test_name
        FROM lab_orders lo
        LEFT JOIN lab_order_tests lot ON lot.lab_order_id = lo.id
       WHERE lo.id = ?
         AND lo.lab_facility_id = ?
       ORDER BY lot.created_at ASC
       LIMIT 1
      `,
      [input.labOrderId, lab.id]
    );
    if (orders.length === 0) throw new Error("Lab order not found for this lab");
    const order = orders[0];
    patientId = String(order.patient_id);
    appointmentId = order.appointment_id ? String(order.appointment_id) : null;
    encounterId = order.encounter_id ? String(order.encounter_id) : null;
    labTestId = input.labTestId || (order.lab_test_id ? String(order.lab_test_id) : null);
    testName = input.reportName || String(order.test_name || input.fileName);
  }

  if (!patientId) throw new Error("Patient is required");

  const [patientRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, first_name, last_name, email FROM patients WHERE id = ? LIMIT 1`,
    [patientId]
  );
  if (patientRows.length === 0) throw new Error("Patient not found");

  const id = uuid();
  const reportUrl = `/api/lab-reports/${id}/download`;
  await pool.query(
    `
    INSERT INTO lab_reports
      (id, patient_id, appointment_id, encounter_id, lab_test_id, lab_order_id,
       uploaded_by, report_name, report_file_url, report_file_data, mime,
       remarks, status, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      id,
      patientId,
      appointmentId,
      encounterId,
      labTestId,
      input.labOrderId || null,
      userId,
      input.reportName || input.fileName,
      reportUrl,
      input.buffer,
      input.mime || "application/pdf",
      input.remarks || null,
      status,
    ]
  );

  if (input.labOrderId) {
    await pool.query(
      `
      INSERT INTO lab_order_results
        (id, lab_order_id, test_name, file_name, mime, file_data, note, uploaded_by, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        uuid(),
        input.labOrderId,
        testName,
        input.fileName,
        input.mime,
        input.buffer,
        input.remarks || null,
        userId,
      ]
    );
  }

  if (input.labOrderId && status === "UPLOADED") {
    await pool.query(
      `UPDATE lab_orders SET status = 'COMPLETED' WHERE id = ? AND lab_facility_id = ?`,
      [input.labOrderId, lab.id]
    );
  }

  if (status === "UPLOADED" && patientRows[0].email) {
    try {
      await sendLabReportReadyEmail({
        email: String(patientRows[0].email),
        patientName: patientName(patientRows[0]),
        testName,
        reportDate: new Date().toLocaleDateString("en-IN"),
      });
    } catch (error) {
      logger.error("Failed to send lab report email", error);
    }
  }

  await writeAuditLog({
    actorId: userId,
    actorRole: actor?.actorRole ?? "LAB_TECH",
    action: "LAB_REPORT_UPLOADED",
    resourceType: "lab_report",
    resourceId: id,
    patientId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `status=${status}`,
  });

  return { id, report_file_url: reportUrl, status };
};

export const updateLabReportService = async (
  userId: string,
  reportId: string,
  input: { status?: string; remarks?: string | null; reportName?: string | null },
  actor?: ActorContext
) => {
  await ensureLabCanAccess(userId, reportId);
  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.status !== undefined) {
    fields.push("status = ?");
    params.push(normalizeStatus(input.status));
  }
  if (input.remarks !== undefined) {
    fields.push("remarks = ?");
    params.push(input.remarks || null);
  }
  if (input.reportName !== undefined) {
    fields.push("report_name = ?");
    params.push(input.reportName || "Lab report");
  }
  if (fields.length === 0) throw new Error("Nothing to update");
  params.push(reportId);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE lab_reports SET ${fields.join(", ")} WHERE id = ?`,
    params
  );
  if (result.affectedRows === 0) throw new Error("Report not found");

  await writeAuditLog({
    actorId: userId,
    actorRole: actor?.actorRole ?? "LAB_TECH",
    action: "LAB_REPORT_UPDATED",
    resourceType: "lab_report",
    resourceId: reportId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: input.status ? `status=${normalizeStatus(input.status)}` : "metadata updated",
  });

  return { success: true };
};

const ensureReportAccess = async (
  userId: string,
  role: UserRole,
  report: RowDataPacket
) => {
  if (role === "ADMIN") return;
  if (role === "PATIENT") return ensurePatientCanAccess(userId, String(report.patient_id));
  if (role === "PROVIDER") return ensureProviderCanAccessPatient(userId, String(report.patient_id));
  if (role === "HOSPITAL_ADMIN") return ensureHospitalCanAccess(userId, String(report.id));
  if (role === "LAB_TECH" || role === "LAB_ADMIN") return ensureLabCanAccess(userId, String(report.id));
  throw new Error("Forbidden");
};

export const getLabReportService = async (
  userId: string,
  role: UserRole,
  reportId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${reportSelect} ${reportJoins} WHERE lr.id = ? LIMIT 1`,
    [reportId]
  );
  if (rows.length === 0) throw new Error("Report not found");
  await ensureReportAccess(userId, role, rows[0]);
  return rows[0];
};

export const getLabReportFileService = async (
  userId: string,
  role: UserRole,
  reportId: string,
  actor?: ActorContext
) => {
  await getLabReportService(userId, role, reportId);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, patient_id, report_name, mime, report_file_data FROM lab_reports WHERE id = ?`,
    [reportId]
  );
  if (rows.length === 0 || !rows[0].report_file_data) throw new Error("Report file not found");

  await writeAuditLog({
    actorId: userId,
    actorRole: role,
    action: "LAB_REPORT_DOWNLOADED",
    resourceType: "lab_report",
    resourceId: reportId,
    patientId: String(rows[0].patient_id),
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: "download",
  });

  return rows[0];
};

export const listPatientLabReportsService = async (
  currentUserId: string,
  role: UserRole,
  patientId: string,
  filters: { search?: string; status?: string; from?: string; to?: string } = {}
) => {
  if (role === "PATIENT") await ensurePatientCanAccess(currentUserId, patientId);
  if (role === "PROVIDER") await ensureProviderCanAccessPatient(currentUserId, patientId);

  const where = ["lr.patient_id = ?"];
  const params: unknown[] = [patientId];
  if (filters.status) {
    where.push("lr.status = ?");
    params.push(normalizeStatus(filters.status));
  }
  if (filters.from) {
    where.push("DATE(lr.uploaded_at) >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    where.push("DATE(lr.uploaded_at) <= ?");
    params.push(filters.to);
  }
  if (filters.search) {
    where.push("(lr.report_name LIKE ? OR lt.name LIKE ? OR lab.name LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `${reportSelect} ${reportJoins}
     WHERE ${where.join(" AND ")}
     ORDER BY lr.uploaded_at DESC, lr.created_at DESC`,
    params
  );
  return rows;
};

export const listMyPatientLabReportsService = async (
  currentUserId: string,
  filters: { search?: string; status?: string; from?: string; to?: string } = {}
) => {
  const [patients] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM patients WHERE user_id = ? LIMIT 1`,
    [currentUserId]
  );
  if (patients.length === 0) throw new Error("Patient not found");
  return listPatientLabReportsService(
    currentUserId,
    "PATIENT",
    String(patients[0].id),
    filters
  );
};

export const listDoctorLabReportsService = async (
  currentUserId: string,
  doctorId: string,
  filters: { search?: string; status?: string; from?: string; to?: string } = {}
) => {
  const [providerRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM providers WHERE user_id = ? LIMIT 1`,
    [currentUserId]
  );
  if (providerRows.length === 0 || String(providerRows[0].id) !== doctorId) {
    throw new Error("Forbidden");
  }

  const where = [
    `EXISTS (
      SELECT 1
        FROM appointments a
       WHERE a.patient_id = lr.patient_id
         AND a.provider_id = ?
    )`,
  ];
  const params: unknown[] = [doctorId];
  if (filters.status) {
    where.push("lr.status = ?");
    params.push(normalizeStatus(filters.status));
  }
  if (filters.from) {
    where.push("DATE(lr.uploaded_at) >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    where.push("DATE(lr.uploaded_at) <= ?");
    params.push(filters.to);
  }
  if (filters.search) {
    where.push("(lr.report_name LIKE ? OR lt.name LIKE ? OR lab.name LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `${reportSelect} ${reportJoins}
     WHERE ${where.join(" AND ")}
     ORDER BY lr.uploaded_at DESC, lr.created_at DESC`,
    params
  );
  return rows;
};

export const deleteLabReportService = async (
  userId: string,
  role: UserRole,
  reportId: string,
  actor?: ActorContext
) => {
  const report = await getLabReportService(userId, role, reportId);
  if (!["LAB_TECH", "LAB_ADMIN", "HOSPITAL_ADMIN", "ADMIN"].includes(role)) {
    throw new Error("Forbidden");
  }
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM lab_reports WHERE id = ?`,
    [reportId]
  );
  if (result.affectedRows === 0) throw new Error("Report not found");
  await writeAuditLog({
    actorId: userId,
    actorRole: role,
    action: "LAB_REPORT_DELETED",
    resourceType: "lab_report",
    resourceId: reportId,
    patientId: String(report.patient_id),
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: "deleted",
  });
  return { success: true };
};

export const getLabReportStatsService = async (userId: string) => {
  const lab = await resolveLabForUser(userId);
  const [[stats]] = await pool.query<RowDataPacket[]>(
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
    totalTests: Number(stats.total_tests ?? 0),
    pendingReports: Number(stats.pending_reports ?? 0),
    completedReports: Number(stats.completed_reports ?? 0),
    uploadedToday: Number(stats.uploaded_today ?? 0),
    patientsTested: Number(stats.patients_tested ?? 0),
  };
};
