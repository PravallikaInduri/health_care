import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import { logger } from "../utils/logger";

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  patientId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean | null;
  reason?: string | null;
}

/**
 * Writes a row into audit_logs. Best-effort: a logging failure must never
 * break the primary action, so all errors are swallowed and logged to console.
 * Note: patient_id has a FK to patients(id), so only pass a real patient id.
 */
export const writeAuditLog = async (
  entry: AuditEntry
): Promise<void> => {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs
      (
        id,
        actor_id,
        actor_role,
        action,
        resource_type,
        resource_id,
        patient_id,
        ip,
        user_agent,
        success,
        reason
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        uuid(),
        entry.actorId ?? null,
        entry.actorRole ?? null,
        entry.action,
        entry.resourceType ?? null,
        entry.resourceId ?? null,
        entry.patientId ?? null,
        entry.ip ?? null,
        entry.userAgent ?? null,
        entry.success ?? null,
        entry.reason ?? null
      ]
    );
  } catch (error) {
    logger.error(
      "Failed to write audit log:",
      (error as Error).message
    );
  }
};

export interface AuditLogFilters {
  actorId?: string;
  patientId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const getAuditLogsService = async (
  filters: AuditLogFilters
) => {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.actorId) {
    where.push("a.actor_id = ?");
    params.push(filters.actorId);
  }

  if (filters.patientId) {
    where.push("a.patient_id = ?");
    params.push(filters.patientId);
  }

  if (filters.action) {
    where.push("a.action = ?");
    params.push(filters.action);
  }

  if (filters.from) {
    where.push("a.occurred_at >= ?");
    params.push(filters.from);
  }

  if (filters.to) {
    where.push("a.occurred_at <= ?");
    params.push(filters.to);
  }

  const whereSql = where.length
    ? `WHERE ${where.join(" AND ")}`
    : "";

  // Clamp pagination to safe integers (inlined since they are validated numbers)
  const page = Math.max(
    1,
    Number(filters.page) || 1
  );
  const limit = Math.min(
    100,
    Math.max(1, Number(filters.limit) || 20)
  );
  const offset = (page - 1) * limit;

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      a.id,
      a.actor_id,
      a.actor_role,
      a.action,
      a.resource_type,
      a.resource_id,
      a.patient_id,
      a.ip,
      a.user_agent,
      a.success,
      a.reason,
      a.occurred_at,
      u.email AS actor_email,
      CONCAT(p.first_name, ' ', p.last_name) AS patient_name
    FROM audit_logs a
    LEFT JOIN users u
      ON a.actor_id = u.id
    LEFT JOIN patients p
      ON a.patient_id = p.id
    ${whereSql}
    ORDER BY a.occurred_at DESC
    LIMIT ${limit} OFFSET ${offset}
    `,
    params
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM audit_logs a
    ${whereSql}
    `,
    params
  );

  const total = countRows[0].total;

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
