import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";

/**
 * Search the medication catalogue by name or generic name. Returns the whole
 * (small) catalogue when no search term is supplied.
 */
export const listMedicationsService = async (search?: string) => {
  const where: string[] = [];
  const params: unknown[] = [];

  if (search && search.trim()) {
    where.push("(m.name LIKE ? OR m.generic_name LIKE ?)");
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  /* Flag the medicines that pharmacies have actually stocked + priced in their
     catalogues so the prescriber's dropdown can suggest them first. The
     representative price is the lowest active price across all pharmacies. */
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      m.id,
      m.name,
      m.generic_name,
      m.ndc_code,
      m.atc_class,
      MAX(CASE WHEN pm.id IS NOT NULL THEN 1 ELSE 0 END) AS in_pharmacy,
      MIN(pm.price) AS pharmacy_price
    FROM medications m
    LEFT JOIN pharmacy_medicines pm
           ON pm.medication_id = m.id AND pm.is_active = 1
    ${whereSql}
    GROUP BY m.id, m.name, m.generic_name, m.ndc_code, m.atc_class
    ORDER BY in_pharmacy DESC, m.name
    LIMIT 100
    `,
    params
  );

  return rows.map((r: RowDataPacket) => ({
    ...r,
    in_pharmacy: Number(r.in_pharmacy) === 1,
    pharmacy_price: r.pharmacy_price != null ? Number(r.pharmacy_price) : null,
  }));
};

/**
 * Add a medication to the catalogue. If one with the same name already exists
 * it is returned instead of creating a duplicate.
 */
export const createMedicationService = async (data: {
  name?: string;
  generic_name?: string;
}) => {
  const name = (data.name || "").trim();
  if (!name) {
    throw new Error("Medication name is required");
  }

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, generic_name FROM medications WHERE name = ?`,
    [name]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  const id = uuid();
  const genericName = (data.generic_name || "").trim() || null;

  await pool.query(
    `INSERT INTO medications (id, name, generic_name) VALUES (?, ?, ?)`,
    [id, name, genericName]
  );

  return { id, name, generic_name: genericName };
};
