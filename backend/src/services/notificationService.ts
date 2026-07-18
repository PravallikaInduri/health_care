import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";

/* ----------------------------------------------------------------
   In-app notifications.  Used by the appointment / unavailability
   flows.  Persists per-user.
-----------------------------------------------------------------*/

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  meta?: Record<string, unknown> | null;
}

export const createNotification = async (
  data: NotificationPayload
) => {
  const id = uuid();
  await pool.query(
    `INSERT INTO notifications
       (id, user_id, type, title, body, link, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.userId,
      data.type,
      data.title,
      data.body ?? null,
      data.link ?? null,
      data.meta ? JSON.stringify(data.meta) : null,
    ]
  );
  return { id };
};

export interface NotificationListFilters {
  unreadOnly?: boolean;
  limit?: number;
}

export const listNotificationsService = async (
  userId: string,
  filters: NotificationListFilters = {}
) => {
  const safeLimit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
  const where: string[] = ["user_id = ?"];
  const params: unknown[] = [userId];
  if (filters.unreadOnly) where.push("is_read = 0");

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT id, user_id, type, title, body, link, meta_json,
           is_read, created_at, read_at
      FROM notifications
     WHERE ${where.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT ${safeLimit}
    `,
    params
  );

  const [[unread]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM notifications
      WHERE user_id = ? AND is_read = 0`,
    [userId]
  );

  return {
    data: rows.map((r: RowDataPacket) => ({
      ...r,
      meta: r.meta_json ? safeJson(r.meta_json) : null,
    })),
    unreadCount: Number(unread.n) || 0,
  };
};

const safeJson = (v: unknown) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return null;
  }
};

export const markNotificationReadService = async (
  userId: string,
  id: string
) => {
  const [r] = await pool.query<ResultSetHeader>(
    `UPDATE notifications
        SET is_read = 1, read_at = NOW()
      WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  if (r.affectedRows === 0) {
    throw new Error("Notification not found");
  }
  return { success: true };
};

export const markAllReadService = async (userId: string) => {
  await pool.query(
    `UPDATE notifications
        SET is_read = 1, read_at = NOW()
      WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return { success: true };
};
