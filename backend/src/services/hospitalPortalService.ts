import pool from "../config/db";
import { v4 as uuid } from "uuid";
import bcrypt from "bcrypt";
import { sendStaffCredentialsEmail } from "../utils/mail";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { logger } from "../utils/logger";

type QueryParam = string | number | boolean | Date | null;
type DbRow = RowDataPacket & Record<string, string | number | boolean | Date | null | undefined>;

const ROLE_LABEL: Record<string, string> = {
  LAB_TECH: "Lab Technician",
  PHARMACY: "Pharmacist",
};

const UNIT_TYPES = ["LAB", "PHARMACY"] as const;
type UnitType = (typeof UNIT_TYPES)[number];

/* The staff role that owns/operates a given unit type. */
const ROLE_FOR_UNIT: Record<UnitType, string> = {
  LAB: "LAB_TECH",
  PHARMACY: "PHARMACY",
};

/**
 * Resolve the HOSPITAL facility a user administers. The hospital admin is
 * linked through facility_staff (staff_role = 'HOSPITAL_ADMIN').
 */
export const resolveHospitalForUser = async (
  userId: string
): Promise<{ id: string; name: string } | null> => {
  const [rows] = await pool.query<DbRow[]>(
    `
    SELECT f.id, f.name
      FROM facility_staff fs
      JOIN facilities f ON f.id = fs.facility_id
     WHERE fs.user_id = ?
       AND fs.staff_role = 'HOSPITAL_ADMIN'
       AND f.type = 'HOSPITAL'
     LIMIT 1
    `,
    [userId]
  );
  return rows.length
    ? { id: String(rows[0].id), name: String(rows[0].name) }
    : null;
};

const requireHospital = async (userId: string) => {
  const hospital = await resolveHospitalForUser(userId);
  if (!hospital) {
    throw new Error("No hospital is associated with this account");
  }
  return hospital;
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const uniqueDepartmentSlug = async (name: string, excludeId?: string) => {
  const base = toSlug(name) || "department";
  let slug = base;
  let suffix = 2;

  while (true) {
    const params: QueryParam[] = [slug];
    let sql = `SELECT id FROM departments WHERE slug = ?`;
    if (excludeId) {
      sql += ` AND id <> ?`;
      params.push(excludeId);
    }
    sql += ` LIMIT 1`;

    const [rows] = await pool.query<DbRow[]>(sql, params);
    if (rows.length === 0) return slug;

    slug = `${base}-${suffix++}`;
  }
};

export const getHospitalOverviewService = async (userId: string) => {
  const hospital = await requireHospital(userId);

  const [[doctors]] = await pool.query<DbRow[]>(
    `SELECT COUNT(*) AS n FROM provider_facilities WHERE facility_id = ?`,
    [hospital.id]
  );

  const [[labs]] = await pool.query<DbRow[]>(
    `SELECT COUNT(*) AS n FROM facilities WHERE parent_facility_id = ? AND type = 'LAB'`,
    [hospital.id]
  );

  const [[pharmacies]] = await pool.query<DbRow[]>(
    `SELECT COUNT(*) AS n FROM facilities WHERE parent_facility_id = ? AND type = 'PHARMACY'`,
    [hospital.id]
  );

  const [[staff]] = await pool.query<DbRow[]>(
    `
    SELECT COUNT(*) AS n
      FROM facility_staff fs
      LEFT JOIN facilities f ON f.id = fs.facility_id
     WHERE fs.facility_id = ?
        OR f.parent_facility_id = ?
    `,
    [hospital.id, hospital.id]
  );

  const [[reportStats]] = await pool.query<DbRow[]>(
    `
    SELECT
      COUNT(lr.id) AS total_lab_reports,
      SUM(CASE WHEN DATE(lr.uploaded_at) = CURDATE() THEN 1 ELSE 0 END) AS reports_uploaded_today,
      SUM(CASE WHEN lr.status IN ('PENDING','SAMPLE_COLLECTED','PROCESSING') THEN 1 ELSE 0 END) AS pending_reports,
      COUNT(DISTINCT CASE WHEN u.is_active = 1 THEN fs.user_id END) AS active_lab_technicians
    FROM facilities lab
    LEFT JOIN lab_orders lo ON lo.lab_facility_id = lab.id
    LEFT JOIN lab_reports lr ON lr.lab_order_id = lo.id
    LEFT JOIN facility_staff fs
      ON fs.facility_id = lab.id
     AND fs.staff_role IN ('LAB_TECH','LAB_ADMIN')
    LEFT JOIN users u ON u.id = fs.user_id
    WHERE lab.parent_facility_id = ?
      AND lab.type = 'LAB'
    `,
    [hospital.id]
  );

  /* Sprint 12 — per-unit pending workload so the admin can see, at a
     glance, how much work is queued in each lab / pharmacy unit. */
  const [unitRows] = await pool.query<DbRow[]>(
    `
    SELECT f.id, f.name, f.type,
           CASE
             WHEN f.type = 'LAB' THEN (
               SELECT COUNT(*) FROM lab_orders lo
                WHERE lo.lab_facility_id = f.id
                  AND lo.status IN ('ORDERED','RECEIVED','IN_PROGRESS')
             )
             ELSE (
               SELECT COUNT(*) FROM prescriptions rx
                WHERE rx.pharmacy_facility_id = f.id
                  AND rx.status = 'ACTIVE'
             )
           END AS pending
      FROM facilities f
     WHERE f.parent_facility_id = ?
       AND f.type IN ('LAB','PHARMACY')
     ORDER BY f.type, f.name
    `,
    [hospital.id]
  );

  /* Unrouted orders/prescriptions for this hospital (no unit configured). */
  const [[unrouted]] = await pool.query<DbRow[]>(
    `
    SELECT
      (SELECT COUNT(*)
         FROM lab_orders lo
         JOIN encounters e   ON e.id = lo.encounter_id
         JOIN appointments a ON a.id = e.appointment_id
        WHERE a.facility_id = ? AND lo.lab_facility_id IS NULL) AS lab_orders,
      (SELECT COUNT(*)
         FROM prescriptions rx
         JOIN encounters e   ON e.id = rx.encounter_id
         JOIN appointments a ON a.id = e.appointment_id
        WHERE a.facility_id = ? AND rx.pharmacy_facility_id IS NULL) AS prescriptions
    `,
    [hospital.id, hospital.id]
  );

  /* Departments attached to this hospital */
  const [[departments]] = await pool.query<DbRow[]>(
    `SELECT COUNT(*) AS n FROM facility_departments WHERE facility_id = ?`,
    [hospital.id]
  );

  /* Distinct patients who have had appointments at this hospital. */
  const [[patients]] = await pool.query<DbRow[]>(
    `
    SELECT COUNT(DISTINCT a.patient_id) AS n
      FROM appointments a
     WHERE a.facility_id = ?
    `,
    [hospital.id]
  );

  /* Recent appointments (last 5) */
  const [recentAppts] = await pool.query<DbRow[]>(
    `
    SELECT
      a.id,
      a.scheduled_at,
      a.status,
      CONCAT(pat.first_name,' ',pat.last_name) AS patient_name,
      pr.name AS doctor_name
    FROM appointments a
    JOIN patients pat ON pat.id = a.patient_id
    JOIN providers pr ON pr.id = a.provider_id
    WHERE a.facility_id = ?
    ORDER BY a.scheduled_at DESC
    LIMIT 5
    `,
    [hospital.id]
  );

  /* Recent patients are distinct patients ordered by their latest visit. */
  const [recentPatients] = await pool.query<DbRow[]>(
    `
    SELECT
      p.id,
      p.mrn,
      p.first_name,
      p.last_name,
      p.sex,
      p.dob,
      MAX(a.scheduled_at) AS last_visit
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.facility_id = ?
    GROUP BY p.id, p.mrn, p.first_name, p.last_name, p.sex, p.dob
    ORDER BY last_visit DESC
    LIMIT 5
    `,
    [hospital.id]
  );

  /* Department-level analytics from the actual appointment/provider links. */
  const [departmentStats] = await pool.query<DbRow[]>(
    `
    SELECT
      d.id,
      d.name,
      d.description,
      COUNT(DISTINCT pd.provider_id) AS doctor_count,
      COUNT(DISTINCT a.patient_id) AS patient_count
    FROM facility_departments fd
    JOIN departments d ON d.id = fd.department_id
    LEFT JOIN provider_departments pd ON pd.department_id = d.id
    LEFT JOIN provider_facilities pf
      ON pf.provider_id = pd.provider_id
     AND pf.facility_id = fd.facility_id
    LEFT JOIN appointments a
      ON a.provider_id = pd.provider_id
     AND a.facility_id = fd.facility_id
    WHERE fd.facility_id = ?
    GROUP BY d.id, d.name, d.description
    ORDER BY d.name ASC
    `,
    [hospital.id]
  );

  return {
    hospital,
    counts: {
      doctors: doctors.n,
      labs: labs.n,
      pharmacies: pharmacies.n,
      staff: staff.n,
      departments: departments.n,
      patients: patients.n,
      totalLabReports: Number(reportStats.total_lab_reports ?? 0),
      reportsUploadedToday: Number(reportStats.reports_uploaded_today ?? 0),
      pendingReports: Number(reportStats.pending_reports ?? 0),
      activeLabTechnicians: Number(reportStats.active_lab_technicians ?? 0),
    },
    units: unitRows.map((u: DbRow) => ({
      id: u.id,
      name: u.name,
      type: u.type,
      pending: Number(u.pending ?? 0),
    })),
    unrouted: {
      labOrders: Number(unrouted.lab_orders ?? 0),
      prescriptions: Number(unrouted.prescriptions ?? 0),
    },
    recentAppointments: recentAppts,
    recentPatients,
    departmentStats,
  };
};

export const getHospitalDoctorsService = async (
  userId: string,
  search?: string
) => {
  const hospital = await requireHospital(userId);

  const params: QueryParam[] = [hospital.id];
  let sql = `
    SELECT pr.id, pr.name, pr.specialty, pr.verification_status,
           pr.consultation_fee, pr.video_consultation_fee, u.email
      FROM provider_facilities pf
      JOIN providers pr ON pr.id = pf.provider_id
      JOIN users u ON u.id = pr.user_id
     WHERE pf.facility_id = ?
  `;
  if (search) {
    sql += ` AND (pr.name LIKE ? OR pr.specialty LIKE ? OR u.email LIKE ?)`;
    const t = `%${search}%`;
    params.push(t, t, t);
  }
  sql += ` ORDER BY pr.name`;

  const [rows] = await pool.query<DbRow[]>(sql, params);
  return rows;
};

/**
 * Set/update a doctor's consultation fees (separate in-person and video
 * amounts) for a doctor practising at this hospital. Verifies the doctor is
 * linked to the hospital before updating.
 */
export const updateHospitalDoctorFeeService = async (
  userId: string,
  providerId: string,
  fees: { consultation_fee?: number; video_consultation_fee?: number }
) => {
  const hospital = await requireHospital(userId);

  const sanitize = (value: unknown) => {
    if (value === undefined || value === null || value === "") return null;
    const amount = Math.round(Number(value) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Fee must be a non-negative number");
    }
    return amount;
  };

  const inPerson = sanitize(fees.consultation_fee);
  const video = sanitize(fees.video_consultation_fee);

  if (inPerson === null && video === null) {
    throw new Error("Provide at least one fee to update");
  }

  const [link] = await pool.query<DbRow[]>(
    `SELECT 1 FROM provider_facilities
      WHERE facility_id = ? AND provider_id = ? LIMIT 1`,
    [hospital.id, providerId]
  );
  if (link.length === 0) {
    throw new Error("Doctor is not linked to this hospital");
  }

  const sets: string[] = [];
  const params: QueryParam[] = [];
  if (inPerson !== null) {
    sets.push("consultation_fee = ?");
    params.push(inPerson);
  }
  if (video !== null) {
    sets.push("video_consultation_fee = ?");
    params.push(video);
  }
  params.push(providerId);

  await pool.query(
    `UPDATE providers SET ${sets.join(", ")} WHERE id = ?`,
    params
  );

  return {
    id: providerId,
    consultation_fee: inPerson,
    video_consultation_fee: video,
  };
};

export const getHospitalUnitsService = async (userId: string) => {
  const hospital = await requireHospital(userId);

  const [rows] = await pool.query<DbRow[]>(
    `
    SELECT f.id, f.name, f.type, f.address, f.phone,
           (
             SELECT COUNT(*) FROM facility_staff fs
              WHERE fs.facility_id = f.id
                AND fs.staff_role IN ('LAB_TECH','PHARMACY')
           ) AS staff_count
      FROM facilities f
     WHERE f.parent_facility_id = ?
       AND f.type IN ('LAB','PHARMACY')
     ORDER BY f.type, f.name
    `,
    [hospital.id]
  );
  return rows;
};

export const createHospitalUnitService = async (
  userId: string,
  data: { type: string; name: string; address?: string; phone?: string }
) => {
  const hospital = await requireHospital(userId);

  const type = String(data.type || "").toUpperCase() as UnitType;
  if (!UNIT_TYPES.includes(type)) {
    throw new Error("Unit type must be LAB or PHARMACY");
  }
  if (!data.name || !data.name.trim()) {
    throw new Error("Unit name is required");
  }

  const id = uuid();
  await pool.query(
    `
    INSERT INTO facilities
      (id, name, address, phone, type, approval_status, parent_facility_id, owner_user_id)
    VALUES (?, ?, ?, ?, ?, 'APPROVED', ?, ?)
    `,
    [
      id,
      data.name.trim(),
      data.address ?? null,
      data.phone ?? null,
      type,
      hospital.id,
      userId,
    ]
  );

  return { id, name: data.name.trim(), type };
};

/**
 * Billing for the hospital: appointment payments (consultation fees) collected
 * at this hospital's facility, plus a small revenue summary.
 */
export const getHospitalBillingService = async (userId: string) => {
  const hospital = await requireHospital(userId);

  const [rows] = await pool.query<DbRow[]>(
    `
    SELECT
      a.id,
      a.scheduled_at,
      a.consultation_fee,
      a.payment_status,
      a.paid_at,
      pr.name AS provider_name,
      CONCAT(pt.first_name, ' ', pt.last_name) AS patient_name,
      pt.mrn,
      (
        SELECT p.gateway_txn_id FROM payments p
         WHERE p.appointment_id = a.id AND p.status = 'SUCCESS'
         ORDER BY p.paid_at DESC LIMIT 1
      ) AS gateway_txn_id
    FROM appointments a
    JOIN providers pr ON pr.id = a.provider_id
    LEFT JOIN patients pt ON pt.id = a.patient_id
    WHERE a.facility_id = ?
      AND a.consultation_fee IS NOT NULL
      AND a.consultation_fee > 0
    ORDER BY a.scheduled_at DESC
    `,
    [hospital.id]
  );

  const [[summary]] = await pool.query<DbRow[]>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN a.payment_status = 'PAID' THEN a.consultation_fee ELSE 0 END), 0) AS collected,
      COALESCE(SUM(CASE WHEN a.payment_status <> 'PAID' THEN a.consultation_fee ELSE 0 END), 0) AS pending,
      COUNT(*) AS total
    FROM appointments a
    WHERE a.facility_id = ?
      AND a.consultation_fee IS NOT NULL
      AND a.consultation_fee > 0
    `,
    [hospital.id]
  );

  /* Lab earnings — paid lab orders processed by labs that belong to this
     hospital (facilities.parent_facility_id = hospital). */
  const [labPayments] = await pool.query<DbRow[]>(
    `
    SELECT
      lo.id,
      lo.paid_at,
      lo.amount,
      lab.name AS lab_name,
      CONCAT(pt.first_name, ' ', pt.last_name) AS patient_name,
      pt.mrn
    FROM lab_orders lo
    JOIN facilities lab ON lab.id = lo.lab_facility_id
    LEFT JOIN patients pt ON pt.id = lo.patient_id
    WHERE lab.parent_facility_id = ?
      AND lo.payment_status = 'PAID'
    ORDER BY lo.paid_at DESC
    `,
    [hospital.id]
  );

  /* Pharmacy earnings — paid prescriptions dispensed by pharmacies that
     belong to this hospital. */
  const [pharmacyPayments] = await pool.query<DbRow[]>(
    `
    SELECT
      rx.id,
      rx.paid_at,
      rx.amount,
      ph.name AS pharmacy_name,
      med.name AS medication_name,
      CONCAT(pt.first_name, ' ', pt.last_name) AS patient_name,
      pt.mrn
    FROM prescriptions rx
    JOIN facilities ph ON ph.id = rx.pharmacy_facility_id
    LEFT JOIN medications med ON med.id = rx.medication_id
    LEFT JOIN patients pt ON pt.id = rx.patient_id
    WHERE ph.parent_facility_id = ?
      AND rx.payment_status = 'PAID'
    ORDER BY rx.paid_at DESC
    `,
    [hospital.id]
  );

  const consultations = Number(summary.collected ?? 0);
  const labEarnings = labPayments.reduce(
    (s: number, r: DbRow) => s + Number(r.amount ?? 0),
    0
  );
  const pharmacyEarnings = pharmacyPayments.reduce(
    (s: number, r: DbRow) => s + Number(r.amount ?? 0),
    0
  );

  return {
    hospital,
    summary: {
      collected: consultations,
      pending: Number(summary.pending ?? 0),
      total: Number(summary.total ?? 0),
    },
    earnings: {
      consultations,
      labs: labEarnings,
      pharmacy: pharmacyEarnings,
      total: consultations + labEarnings + pharmacyEarnings,
    },
    payments: rows,
    labPayments,
    pharmacyPayments,
  };
};

/* Ensure the unit exists and belongs to this hospital; return it. */
const requireOwnedUnit = async (hospitalId: string, unitId: string) => {
  const [rows] = await pool.query<DbRow[]>(
    `SELECT id, name, type FROM facilities
      WHERE id = ? AND parent_facility_id = ? AND type IN ('LAB','PHARMACY')`,
    [unitId, hospitalId]
  );
  if (rows.length === 0) {
    throw new Error("Unit not found for this hospital");
  }
  return rows[0];
};

export const updateHospitalUnitService = async (
  userId: string,
  unitId: string,
  data: { name?: string; address?: string; phone?: string }
) => {
  const hospital = await requireHospital(userId);
  await requireOwnedUnit(hospital.id, unitId);

  if (data.name !== undefined && !String(data.name).trim()) {
    throw new Error("Unit name cannot be empty");
  }

  const fields: string[] = [];
  const params: QueryParam[] = [];
  if (data.name !== undefined) {
    fields.push("name = ?");
    params.push(String(data.name).trim());
  }
  if (data.address !== undefined) {
    fields.push("address = ?");
    params.push(data.address || null);
  }
  if (data.phone !== undefined) {
    fields.push("phone = ?");
    params.push(data.phone || null);
  }
  if (fields.length === 0) {
    return { success: true };
  }

  params.push(unitId, hospital.id);
  await pool.query(
    `UPDATE facilities SET ${fields.join(", ")}
      WHERE id = ? AND parent_facility_id = ?`,
    params
  );
  return { success: true };
};

/**
 * Delete a lab/pharmacy unit. This also removes the staff accounts that
 * operate it and detaches linked lab orders / prescriptions that pointed to it
 * (the historical record stays, only the routing link is cleared).
 */
export const deleteHospitalUnitService = async (
  userId: string,
  unitId: string
) => {
  const hospital = await requireHospital(userId);
  const unit = await requireOwnedUnit(hospital.id, unitId);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    /* Detach routing links so the FK / history stays intact. */
    if (unit.type === "LAB") {
      await connection.query(
        `UPDATE lab_orders SET lab_facility_id = NULL WHERE lab_facility_id = ?`,
        [unitId]
      );
    } else {
      await connection.query(
        `UPDATE prescriptions SET pharmacy_facility_id = NULL WHERE pharmacy_facility_id = ?`,
        [unitId]
      );
    }

    /* Remove the staff user accounts tied to this unit, then their links. */
    const [staffRows] = await connection.query<DbRow[]>(
      `SELECT user_id FROM facility_staff WHERE facility_id = ?`,
      [unitId]
    );
    await connection.query(
      `DELETE FROM facility_staff WHERE facility_id = ?`,
      [unitId]
    );
    const userIds = staffRows.map((r: DbRow) => r.user_id).filter(Boolean);
    if (userIds.length > 0) {
      await connection.query(
        `DELETE FROM users WHERE id IN (${userIds.map(() => "?").join(",")})`,
        userIds
      );
    }

    await connection.query(`DELETE FROM facilities WHERE id = ?`, [unitId]);

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getHospitalStaffService = async (userId: string) => {
  const hospital = await requireHospital(userId);

  const [rows] = await pool.query<DbRow[]>(
    `
    SELECT fs.id,
           fs.staff_role,
           fs.display_name,
           fs.created_at,
           u.id AS user_id,
           u.email,
           u.is_active,
           f.id AS unit_id,
           f.name AS unit_name,
           f.type AS unit_type
      FROM facility_staff fs
      JOIN facilities f ON f.id = fs.facility_id
      JOIN users u ON u.id = fs.user_id
     WHERE f.parent_facility_id = ?
       AND fs.staff_role IN ('LAB_TECH','PHARMACY')
     ORDER BY f.type, fs.created_at DESC
    `,
    [hospital.id]
  );
  return rows;
};

export const createHospitalStaffService = async (
  userId: string,
  data: {
    facility_id: string;
    name: string;
    email: string;
    password: string;
  }
) => {
  const hospital = await requireHospital(userId);

  const { facility_id, name, email, password } = data;

  if (!facility_id || !email || !password) {
    throw new Error("Unit, email and password are required");
  }
  if (String(password).length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  /* The unit must belong to this hospital. */
  const [unitRows] = await pool.query<DbRow[]>(
    `SELECT id, name, type FROM facilities WHERE id = ? AND parent_facility_id = ?`,
    [facility_id, hospital.id]
  );
  if (unitRows.length === 0) {
    throw new Error("Unit not found for this hospital");
  }
  const unitType = unitRows[0].type as UnitType;
  const unitName = unitRows[0].name as string;
  if (!UNIT_TYPES.includes(unitType)) {
    throw new Error("Staff can only be added to a lab or pharmacy unit");
  }
  const staffRole = ROLE_FOR_UNIT[unitType];

  const [existing] = await pool.query<DbRow[]>(
    `SELECT id FROM users WHERE email = ?`,
    [email]
  );
  if (existing.length > 0) {
    throw new Error("Email already registered");
  }

  const connection = await pool.getConnection();
  let newUserId = "";
  try {
    await connection.beginTransaction();

    newUserId = `U${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const hashed = await bcrypt.hash(password, 10);

    await connection.query(
      `
      INSERT INTO users (id, email, password_hash, role, approval_status, is_active)
      VALUES (?, ?, ?, ?, 'APPROVED', 1)
      `,
      [newUserId, email, hashed, staffRole]
    );

    await connection.query(
      `
      INSERT INTO facility_staff (id, user_id, facility_id, staff_role, display_name)
      VALUES (?, ?, ?, ?, ?)
      `,
      [uuid(), newUserId, facility_id, staffRole, name ?? null]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  /* Email the credentials — never let a mail failure undo the account. */
  let emailed = true;
  try {
    await sendStaffCredentialsEmail({
      email,
      name,
      password,
      roleLabel: ROLE_LABEL[staffRole] || staffRole,
      unitName,
      hospitalName: hospital.name,
    });
  } catch (mailErr) {
    emailed = false;
    logger.error("Failed to send staff credentials email:", mailErr);
  }

  return {
    success: true,
    userId: newUserId,
    staffRole,
    unitType,
    emailed,
  };
};

/* Ensure the staff row belongs to a unit under this hospital; return it. */
const requireOwnedStaff = async (hospitalId: string, staffId: string) => {
  const [rows] = await pool.query<DbRow[]>(
    `
    SELECT fs.id, fs.user_id, fs.facility_id, fs.staff_role, f.type AS unit_type
      FROM facility_staff fs
      JOIN facilities f ON f.id = fs.facility_id
     WHERE fs.id = ?
       AND f.parent_facility_id = ?
       AND fs.staff_role IN ('LAB_TECH','PHARMACY')
    `,
    [staffId, hospitalId]
  );
  if (rows.length === 0) {
    throw new Error("Staff member not found for this hospital");
  }
  return rows[0];
};

export const updateHospitalStaffService = async (
  userId: string,
  staffId: string,
  data: {
    name?: string;
    password?: string;
    is_active?: boolean;
    facility_id?: string;
  }
) => {
  const hospital = await requireHospital(userId);
  const staff = await requireOwnedStaff(hospital.id, staffId);

  /* Optional reassignment to a different unit (role follows the unit type). */
  let targetFacilityId = staff.facility_id;
  let staffRole = staff.staff_role;
  if (data.facility_id && data.facility_id !== staff.facility_id) {
    const unit = await requireOwnedUnit(hospital.id, data.facility_id);
    targetFacilityId = unit.id;
    staffRole = ROLE_FOR_UNIT[unit.type as UnitType];
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const fsFields: string[] = [];
    const fsParams: QueryParam[] = [];
    if (data.name !== undefined) {
      fsFields.push("display_name = ?");
      fsParams.push(data.name || null);
    }
    if (data.facility_id) {
      fsFields.push("facility_id = ?", "staff_role = ?");
      fsParams.push(targetFacilityId, staffRole);
    }
    if (fsFields.length > 0) {
      fsParams.push(staffId);
      await connection.query(
        `UPDATE facility_staff SET ${fsFields.join(", ")} WHERE id = ?`,
        fsParams
      );
    }

    const uFields: string[] = [];
    const uParams: QueryParam[] = [];
    if (data.facility_id) {
      uFields.push("role = ?");
      uParams.push(staffRole);
    }
    if (data.is_active !== undefined) {
      uFields.push("is_active = ?");
      uParams.push(data.is_active ? 1 : 0);
    }
    if (data.password) {
      if (String(data.password).length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      uFields.push("password_hash = ?");
      uParams.push(await bcrypt.hash(data.password, 10));
    }
    if (uFields.length > 0) {
      uParams.push(staff.user_id);
      await connection.query(
        `UPDATE users SET ${uFields.join(", ")} WHERE id = ?`,
        uParams
      );
    }

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteHospitalStaffService = async (
  userId: string,
  staffId: string
) => {
  const hospital = await requireHospital(userId);
  const staff = await requireOwnedStaff(hospital.id, staffId);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM facility_staff WHERE id = ?`, [
      staffId,
    ]);
    await connection.query(`DELETE FROM users WHERE id = ?`, [staff.user_id]);
    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/* ================================================================
   DEPARTMENT MANAGEMENT — hospital portal
================================================================ */

interface HospitalDepartmentPayload {
  name?: string;
  description?: string | null;
  status?: "ACTIVE" | "INACTIVE" | string;
}

/** List database departments and whether each one is enabled for this hospital. */
export const listHospitalDepartmentsService = async (userId: string) => {
  const hospital = await requireHospital(userId);

  const [rows] = await pool.query<DbRow[]>(
    `
    SELECT
      d.id,
      d.name,
      d.description,
      d.icon,
      CASE WHEN fd.department_id IS NULL THEN 0 ELSE 1 END AS is_attached,
      CASE WHEN fd.department_id IS NULL THEN 'INACTIVE' ELSE 'ACTIVE' END AS status,
      COUNT(DISTINCT pd.provider_id) AS doctor_count,
      COUNT(DISTINCT a.patient_id) AS patient_count
    FROM departments d
    LEFT JOIN facility_departments fd
      ON fd.department_id = d.id
     AND fd.facility_id = ?
    LEFT JOIN provider_departments pd
      ON pd.department_id = d.id
    LEFT JOIN provider_facilities pf
      ON pf.provider_id = pd.provider_id
     AND pf.facility_id = ?
    LEFT JOIN appointments a
      ON a.provider_id = pd.provider_id
     AND a.facility_id = ?
    GROUP BY d.id, d.name, d.description, d.icon, fd.department_id
    ORDER BY is_attached DESC, d.name ASC
    `,
    [hospital.id, hospital.id, hospital.id]
  );

  return { hospital, departments: rows };
};

export const createHospitalDepartmentService = async (
  userId: string,
  data: HospitalDepartmentPayload
) => {
  const hospital = await requireHospital(userId);
  const name = String(data.name ?? "").trim();
  if (!name) throw new Error("Department name is required");

  const slug = await uniqueDepartmentSlug(name);
  const id = uuid();

  await pool.query(
    `
    INSERT INTO departments (id, name, description, icon, slug)
    VALUES (?, ?, ?, ?, ?)
    `,
    [id, name, data.description?.trim() || null, null, slug]
  );

  if (String(data.status ?? "ACTIVE").toUpperCase() === "ACTIVE") {
    await pool.query(
      `INSERT IGNORE INTO facility_departments (facility_id, department_id)
       VALUES (?, ?)`,
      [hospital.id, id]
    );
  }

  return { id, name, description: data.description ?? null, status: data.status ?? "ACTIVE" };
};

export const updateHospitalDepartmentService = async (
  userId: string,
  departmentId: string,
  data: HospitalDepartmentPayload
) => {
  const hospital = await requireHospital(userId);
  const [[dept]] = await pool.query<DbRow[]>(
    `SELECT id, name FROM departments WHERE id = ? LIMIT 1`,
    [departmentId]
  );
  if (!dept) throw new Error("Department not found");

  const fields: string[] = [];
  const params: QueryParam[] = [];

  if (typeof data.name === "string" && data.name.trim()) {
    fields.push("name = ?");
    params.push(data.name.trim());
    fields.push("slug = ?");
    params.push(await uniqueDepartmentSlug(data.name.trim(), departmentId));
  }

  if (typeof data.description !== "undefined") {
    fields.push("description = ?");
    params.push(data.description?.trim() || null);
  }

  if (fields.length > 0) {
    params.push(departmentId);
    await pool.query(`UPDATE departments SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  if (typeof data.status === "string") {
    const status = data.status.toUpperCase();
    if (status === "ACTIVE") {
      await pool.query(
        `INSERT IGNORE INTO facility_departments (facility_id, department_id)
         VALUES (?, ?)`,
        [hospital.id, departmentId]
      );
    } else if (status === "INACTIVE") {
      await pool.query(
        `DELETE FROM facility_departments
          WHERE facility_id = ? AND department_id = ?`,
        [hospital.id, departmentId]
      );
    } else {
      throw new Error("Status must be ACTIVE or INACTIVE");
    }
  }

  return { success: true };
};

export const deleteHospitalDepartmentService = async (
  userId: string,
  departmentId: string
) => {
  const hospital = await requireHospital(userId);
  const [[dept]] = await pool.query<DbRow[]>(
    `SELECT id FROM departments WHERE id = ? LIMIT 1`,
    [departmentId]
  );
  if (!dept) throw new Error("Department not found");

  await pool.query(
    `DELETE FROM facility_departments WHERE facility_id = ? AND department_id = ?`,
    [hospital.id, departmentId]
  );

  const [[usage]] = await pool.query<DbRow[]>(
    `
    SELECT
      (SELECT COUNT(*) FROM facility_departments WHERE department_id = ?) AS facility_links,
      (SELECT COUNT(*) FROM provider_departments WHERE department_id = ?) AS provider_links
    `,
    [departmentId, departmentId]
  );

  if (Number(usage.facility_links) === 0 && Number(usage.provider_links) === 0) {
    await pool.query(`DELETE FROM departments WHERE id = ?`, [departmentId]);
    return { success: true, deleted: true };
  }

  return { success: true, deleted: false };
};

/** Attach an existing global department to this hospital */
export const attachHospitalDepartmentService = async (
  userId: string,
  departmentId: string
) => {
  const hospital = await requireHospital(userId);

  const [[dept]] = await pool.query<DbRow[]>(
    `SELECT id FROM departments WHERE id = ?`,
    [departmentId]
  );
  if (!dept) throw new Error("Department not found");

  await pool.query(
    `INSERT IGNORE INTO facility_departments (facility_id, department_id)
     VALUES (?, ?)`,
    [hospital.id, departmentId]
  );

  return { success: true };
};

/** Detach a department from this hospital */
export const detachHospitalDepartmentService = async (
  userId: string,
  departmentId: string
) => {
  const hospital = await requireHospital(userId);

  const [r] = await pool.query<ResultSetHeader>(
    `DELETE FROM facility_departments
      WHERE facility_id = ? AND department_id = ?`,
    [hospital.id, departmentId]
  );

  if (r.affectedRows === 0)
    throw new Error("Department is not attached to this hospital");

  return { success: true };
};

/* ================================================================
   PATIENT MANAGEMENT — hospital portal (read-only)
================================================================ */

export const listHospitalPatientsService = async (
  userId: string,
  search?: string
) => {
  const hospital = await requireHospital(userId);

  const like = search ? `%${search}%` : null;

  const [rows] = await pool.query<DbRow[]>(
    `
    SELECT DISTINCT
      p.id,
      p.mrn,
      p.first_name,
      p.last_name,
      p.dob,
      p.sex,
      p.phone,
      p.email,
      p.photo_url,
      (
        SELECT a2.scheduled_at
          FROM appointments a2
         WHERE a2.patient_id = p.id
           AND a2.facility_id = ?
         ORDER BY a2.scheduled_at DESC
         LIMIT 1
      ) AS last_visit,
      (
        SELECT pr2.name
          FROM appointments a3
          JOIN providers pr2 ON pr2.id = a3.provider_id
         WHERE a3.patient_id = p.id
           AND a3.facility_id = ?
         ORDER BY a3.scheduled_at DESC
         LIMIT 1
      ) AS assigned_doctor,
      (
        SELECT d2.name
          FROM appointments a4
          JOIN provider_departments pd2 ON pd2.provider_id = a4.provider_id
          JOIN departments d2 ON d2.id = pd2.department_id
          JOIN facility_departments fd2
            ON fd2.department_id = d2.id
           AND fd2.facility_id = a4.facility_id
         WHERE a4.patient_id = p.id
           AND a4.facility_id = ?
         ORDER BY a4.scheduled_at DESC
         LIMIT 1
      ) AS department,
      (
        SELECT a5.status
          FROM appointments a5
         WHERE a5.patient_id = p.id
           AND a5.facility_id = ?
         ORDER BY a5.scheduled_at DESC
         LIMIT 1
      ) AS status
    FROM patients p
    JOIN appointments a ON a.patient_id = p.id
    WHERE a.facility_id = ?
    ${
      like
        ? `AND (
            p.mrn LIKE ?
            OR p.first_name LIKE ?
            OR p.last_name LIKE ?
            OR CONCAT(p.first_name,' ',p.last_name) LIKE ?
          )`
        : ""
    }
    ORDER BY last_visit DESC
    LIMIT 200
    `,
    like
      ? [
          hospital.id,
          hospital.id,
          hospital.id,
          hospital.id,
          hospital.id,
          like,
          like,
          like,
          like,
        ]
      : [hospital.id, hospital.id, hospital.id, hospital.id, hospital.id]
  );

  return { hospital, patients: rows };
};
