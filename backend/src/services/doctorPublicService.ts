import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import { writeAuditLog } from "./auditService";
import { ActorContext } from "../utils/auditContext";

const clampPagination = (page?: number, limit?: number) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
};

/* Public doctor profile (used by patient profile page). */
export const getDoctorPublicProfileService = async (
  providerId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      pr.id,
      pr.name,
      pr.specialty,
      pr.photo_url,
      pr.bio,
      pr.languages,
      pr.experience_years,
      pr.qualifications,
      pr.consultation_fee,
      pr.video_consultation_fee,
      pr.accepting_new,
      pr.npi_or_mci,
      (
        SELECT ROUND(AVG(dr.rating), 1)
          FROM doctor_reviews dr WHERE dr.provider_id = pr.id
      ) AS avg_rating,
      (
        SELECT COUNT(*) FROM doctor_reviews dr WHERE dr.provider_id = pr.id
      ) AS review_count
    FROM providers pr
    WHERE pr.id = ?
      AND pr.verification_status = 'APPROVED'
    LIMIT 1
    `,
    [providerId]
  );

  if (rows.length === 0) {
    throw new Error("Doctor not found");
  }

  /* Departments + facilities the doctor practices in */
  const [departments] = await pool.query<RowDataPacket[]>(
    `
    SELECT d.id, d.name, d.icon, d.slug
      FROM provider_departments pd
      JOIN departments d ON d.id = pd.department_id
     WHERE pd.provider_id = ?
     ORDER BY d.name
    `,
    [providerId]
  );

  const [facilities] = await pool.query<RowDataPacket[]>(
    `
    SELECT f.id, f.name, f.address, f.city, f.logo_url
      FROM provider_facilities pf
      JOIN facilities f ON f.id = pf.facility_id
     WHERE pf.provider_id = ?
     ORDER BY f.name
    `,
    [providerId]
  );

  return {
    ...rows[0],
    departments,
    facilities,
  };
};

/* List reviews for a doctor (paginated). */
export const listDoctorReviewsService = async (
  providerId: string,
  page?: number,
  limit?: number
) => {
  const pg = clampPagination(page, limit);

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      dr.id,
      dr.rating,
      dr.review,
      dr.created_at,
      pat.first_name,
      pat.last_name
    FROM doctor_reviews dr
    LEFT JOIN patients pat ON pat.id = dr.patient_id
    WHERE dr.provider_id = ?
    ORDER BY dr.created_at DESC
    LIMIT ${pg.limit} OFFSET ${pg.offset}
    `,
    [providerId]
  );

  const [[c]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM doctor_reviews WHERE provider_id = ?`,
    [providerId]
  );
  const total = Number(c.total) || 0;

  return {
    data: rows,
    pagination: {
      page: pg.page,
      limit: pg.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / pg.limit)),
    },
  };
};

/* Create a review (PATIENT only, must have at least one COMPLETED appt). */
export const createDoctorReviewService = async (
  userId: string,
  providerId: string,
  rating: number,
  review: string | null,
  actor?: ActorContext
) => {
  const safeRating = Number(rating);
  if (
    !Number.isFinite(safeRating) ||
    safeRating < 1 ||
    safeRating > 5
  ) {
    throw new Error("Rating must be between 1 and 5");
  }

  const [patientRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM patients WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  if (patientRows.length === 0) {
    throw new Error("Patient not found");
  }
  const patientId = patientRows[0].id;

  /* Eligibility: at least one COMPLETED appointment with this provider */
  const [eligible] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM appointments
      WHERE patient_id = ?
        AND provider_id = ?
        AND status = 'COMPLETED'
      LIMIT 1`,
    [patientId, providerId]
  );
  if (eligible.length === 0) {
    throw new Error(
      "You can only review a doctor after completing an appointment with them"
    );
  }

  /* One review per patient/provider — replace if it already exists. */
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM doctor_reviews
      WHERE patient_id = ? AND provider_id = ? LIMIT 1`,
    [patientId, providerId]
  );

  if (existing.length > 0) {
    await pool.query(
      `UPDATE doctor_reviews
          SET rating = ?, review = ?, created_at = NOW()
        WHERE id = ?`,
      [safeRating, review, existing[0].id]
    );

    await writeAuditLog({
      actorId: actor?.actorId ?? userId,
      actorRole: actor?.actorRole ?? "PATIENT",
      action: "REVIEW_UPDATED",
      resourceType: "doctor_review",
      resourceId: existing[0].id,
      ip: actor?.ip ?? null,
      userAgent: actor?.userAgent ?? null,
      success: true,
      reason: `provider=${providerId}`,
    });

    return { reviewId: existing[0].id, updated: true };
  }

  const id = uuid();
  await pool.query(
    `INSERT INTO doctor_reviews
       (id, patient_id, provider_id, rating, review)
     VALUES (?, ?, ?, ?, ?)`,
    [id, patientId, providerId, safeRating, review]
  );

  await writeAuditLog({
    actorId: actor?.actorId ?? userId,
    actorRole: actor?.actorRole ?? "PATIENT",
    action: "REVIEW_CREATED",
    resourceType: "doctor_review",
    resourceId: id,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `provider=${providerId}`,
  });

  return { reviewId: id, updated: false };
};
