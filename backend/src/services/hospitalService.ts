import type { RowDataPacket } from "mysql2";
import pool from "../config/db";

const clampPagination = (page?: number, limit?: number) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
};

/* -----------------------------------------------------------------
   LIST HOSPITALS — used by public patient hospital directory.
   Computes doctor_count, department_count and avg_rating per row.
------------------------------------------------------------------*/
export interface HospitalListFilters {
  search?: string;
  city?: string;
  page?: number;
  limit?: number;
}

export const listHospitalsService = async (
  filters: HospitalListFilters = {}
) => {
  const where: string[] = [
    "f.type = 'HOSPITAL'",
    "f.approval_status = 'APPROVED'"
  ];
  const params: unknown[] = [];

  if (filters.search) {
    where.push(
      "(f.name LIKE ? OR f.address LIKE ? OR f.city LIKE ?)"
    );
    const t = `%${filters.search}%`;
    params.push(t, t, t);
  }
  if (filters.city) {
    where.push("f.city = ?");
    params.push(filters.city);
  }

  const { page, limit, offset } = clampPagination(
    filters.page,
    filters.limit
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      f.id,
      f.name,
      f.address,
      f.city,
      f.phone,
      f.email,
      f.about,
      f.logo_url,
      f.cover_url,
      f.established_year,
      f.type,
      (
        SELECT COUNT(DISTINCT pf.provider_id)
          FROM provider_facilities pf
          JOIN providers pr ON pr.id = pf.provider_id
         WHERE pf.facility_id = f.id
           AND pr.verification_status = 'APPROVED'
      ) AS doctor_count,
      (
        SELECT COUNT(*)
          FROM facility_departments fd
         WHERE fd.facility_id = f.id
      ) AS department_count,
      (
        SELECT ROUND(AVG(dr.rating), 1)
          FROM doctor_reviews dr
          JOIN provider_facilities pf2
            ON pf2.provider_id = dr.provider_id
         WHERE pf2.facility_id = f.id
      ) AS avg_rating,
      (
        SELECT COUNT(*)
          FROM doctor_reviews dr
          JOIN provider_facilities pf3
            ON pf3.provider_id = dr.provider_id
         WHERE pf3.facility_id = f.id
      ) AS review_count
    FROM facilities f
    WHERE ${where.join(" AND ")}
    ORDER BY f.name ASC
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM facilities f
      WHERE ${where.join(" AND ")}`,
    params
  );
  const total = Number(countRows[0]?.total ?? 0);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

/* -----------------------------------------------------------------
   HOSPITAL DETAIL
------------------------------------------------------------------*/
export const getHospitalByIdService = async (id: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      f.*,
      (
        SELECT COUNT(DISTINCT pf.provider_id)
          FROM provider_facilities pf
          JOIN providers pr ON pr.id = pf.provider_id
         WHERE pf.facility_id = f.id
           AND pr.verification_status = 'APPROVED'
      ) AS doctor_count,
      (
        SELECT COUNT(*)
          FROM facility_departments fd
         WHERE fd.facility_id = f.id
      ) AS department_count,
      (
        SELECT ROUND(AVG(dr.rating), 1)
          FROM doctor_reviews dr
          JOIN provider_facilities pf2
            ON pf2.provider_id = dr.provider_id
         WHERE pf2.facility_id = f.id
      ) AS avg_rating,
      (
        SELECT COUNT(*)
          FROM doctor_reviews dr
          JOIN provider_facilities pf3
            ON pf3.provider_id = dr.provider_id
         WHERE pf3.facility_id = f.id
      ) AS review_count
    FROM facilities f
    WHERE f.id = ?
      AND f.approval_status = 'APPROVED'
    LIMIT 1
    `,
    [id]
  );

  if (rows.length === 0) {
    throw new Error("Hospital not found");
  }

  return rows[0];
};

/* -----------------------------------------------------------------
   DEPARTMENTS AT A HOSPITAL — only departments that have at least
   one approved provider linked through provider_departments AND
   provider_facilities.
------------------------------------------------------------------*/
export const getHospitalDepartmentsService = async (
  facilityId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      d.id,
      d.name,
      d.description,
      d.icon,
      d.slug,
      (
        SELECT COUNT(DISTINCT pr.id)
          FROM providers pr
          JOIN provider_facilities pf ON pf.provider_id = pr.id
          LEFT JOIN provider_departments pd
            ON pd.provider_id = pr.id AND pd.department_id = d.id
         WHERE pf.facility_id = ?
           AND pr.verification_status = 'APPROVED'
           AND (
             pd.provider_id IS NOT NULL
             OR LOWER(TRIM(pr.specialty)) = LOWER(TRIM(d.name))
             OR LOWER(TRIM(pr.specialty)) = LOWER(TRIM(d.slug))
           )
      ) AS doctor_count
    FROM facility_departments fd
    JOIN departments d ON d.id = fd.department_id
    WHERE fd.facility_id = ?
    ORDER BY d.name ASC
    `,
    [facilityId, facilityId]
  );
  return rows;
};

/* -----------------------------------------------------------------
   DOCTORS IN A DEPARTMENT AT A HOSPITAL
------------------------------------------------------------------*/
export interface DoctorListFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export const getHospitalDepartmentDoctorsService = async (
  facilityId: string,
  departmentId: string,
  filters: DoctorListFilters = {}
) => {
  /* A doctor belongs to a department either through an explicit
     provider_departments link OR because their specialty matches the
     department name/slug. The second case keeps the booking flow working
     even when the admin hasn't manually mapped doctors to departments. */
  const where: string[] = [
    "pf.facility_id = ?",
    "pr.verification_status = 'APPROVED'",
    `(
        pd.provider_id IS NOT NULL
        OR LOWER(TRIM(pr.specialty)) = LOWER(TRIM(d.name))
        OR LOWER(TRIM(pr.specialty)) = LOWER(TRIM(d.slug))
     )`,
  ];
  const params: unknown[] = [departmentId, facilityId];

  if (filters.search) {
    where.push("(pr.name LIKE ? OR pr.specialty LIKE ?)");
    const t = `%${filters.search}%`;
    params.push(t, t);
  }

  const { page, limit, offset } = clampPagination(
    filters.page,
    filters.limit
  );

  const fromClause = `
    FROM providers pr
    JOIN provider_facilities pf ON pf.provider_id = pr.id
    JOIN departments d ON d.id = ?
    LEFT JOIN provider_departments pd
      ON pd.provider_id = pr.id AND pd.department_id = d.id
  `;

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
      pr.accepting_new,
      (
        SELECT ROUND(AVG(dr.rating), 1)
          FROM doctor_reviews dr WHERE dr.provider_id = pr.id
      ) AS avg_rating,
      (
        SELECT COUNT(*) FROM doctor_reviews dr WHERE dr.provider_id = pr.id
      ) AS review_count
    ${fromClause}
    WHERE ${where.join(" AND ")}
    ORDER BY pr.name ASC
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(DISTINCT pr.id) AS total
    ${fromClause}
    WHERE ${where.join(" AND ")}
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
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

/* -----------------------------------------------------------------
   DEPARTMENT BY ID (public)
------------------------------------------------------------------*/
export const getDepartmentByIdService = async (id: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, description, icon, slug
       FROM departments WHERE id = ? LIMIT 1`,
    [id]
  );
  if (rows.length === 0) {
    throw new Error("Department not found");
  }
  return rows[0];
};
