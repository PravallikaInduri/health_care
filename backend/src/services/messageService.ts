import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import {
  getPatientIdByUser,
  getProviderIdByUser
} from "../utils/identity";
import { emitToUsers } from "../config/socket";

export interface Participant {
  role: "PATIENT" | "PROVIDER";
  patientId: string | null;
  providerId: string | null;
}

/**
 * Resolve the messaging participant (patient or provider) for a user.
 * Threads link a patient_id and provider_id, so we need to know which side
 * the requesting user sits on to scope access.
 */
const resolveParticipant = async (
  userId: string,
  role: string
): Promise<Participant> => {
  if (role === "PROVIDER") {
    const providerId = await getProviderIdByUser(userId);
    if (!providerId) {
      throw new Error("No provider record linked to this account");
    }
    return { role: "PROVIDER", patientId: null, providerId };
  }

  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }
  return { role: "PATIENT", patientId, providerId: null };
};

/**
 * Resolve the two participant user ids (patient + provider) for a thread, so
 * real-time events can be pushed to both of their private socket rooms.
 */
const getParticipantUserIds = async (
  threadId: string
): Promise<string[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT pat.user_id AS patient_user_id, prov.user_id AS provider_user_id
    FROM message_threads t
    JOIN patients pat ON t.patient_id = pat.id
    JOIN providers prov ON t.provider_id = prov.id
    WHERE t.id = ?
    `,
    [threadId]
  );
  if (rows.length === 0) return [];
  return [rows[0].patient_user_id, rows[0].provider_user_id];
};

/**
 * Fetch a single message row (used to build real-time event payloads).
 */
const getMessageRow = async (messageId: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT id, thread_id, sender_id, body, sent_at, read_at, edited_at
    FROM messages
    WHERE id = ?
    `,
    [messageId]
  );
  return rows[0];
};

/**
 * List all threads the user participates in, newest activity first, with the
 * other party's name, a short preview of the last message and an unread count.
 */
export const listThreadsService = async (
  userId: string,
  role: string
) => {
  const me = await resolveParticipant(userId, role);

  const whereCol =
    me.role === "PROVIDER" ? "t.provider_id = ?" : "t.patient_id = ?";
  const whereVal =
    me.role === "PROVIDER" ? me.providerId : me.patientId;

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      t.id,
      t.patient_id,
      t.provider_id,
      t.subject,
      t.last_message_at,
      CONCAT(pat.first_name, ' ', pat.last_name) AS patient_name,
      prov.name AS provider_name,
      (
        SELECT m.body
        FROM messages m
        WHERE m.thread_id = t.id
        ORDER BY m.sent_at DESC
        LIMIT 1
      ) AS last_message,
      (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.thread_id = t.id
          AND m.read_at IS NULL
          AND m.sender_id <> ?
      ) AS unread_count
    FROM message_threads t
    JOIN patients pat ON t.patient_id = pat.id
    JOIN providers prov ON t.provider_id = prov.id
    WHERE ${whereCol}
    ORDER BY t.last_message_at IS NULL, t.last_message_at DESC
    `,
    [userId, whereVal]
  );

  return rows;
};

/**
 * Create a new thread. Patients pick a provider; providers pick a patient.
 * An optional first message body can be sent at creation time.
 */
export const createThreadService = async (
  userId: string,
  role: string,
  data: { provider_id?: string; patient_id?: string; subject?: string; body?: string }
) => {
  const me = await resolveParticipant(userId, role);

  let patientId: string;
  let providerId: string;

  if (me.role === "PATIENT") {
    if (!data.provider_id) {
      throw new Error("provider_id is required");
    }
    patientId = me.patientId as string;
    providerId = data.provider_id;
  } else {
    if (!data.patient_id) {
      throw new Error("patient_id is required");
    }
    providerId = me.providerId as string;
    patientId = data.patient_id;
  }

  /* Validate the counter-party exists */
  const [provRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM providers WHERE id = ?`,
    [providerId]
  );
  if (provRows.length === 0) {
    throw new Error("Provider not found");
  }
  const [patRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM patients WHERE id = ?`,
    [patientId]
  );
  if (patRows.length === 0) {
    throw new Error("Patient not found");
  }

  const threadId = uuid();

  await pool.query(
    `
    INSERT INTO message_threads
      (id, patient_id, provider_id, subject, last_message_at)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      threadId,
      patientId,
      providerId,
      data.subject ?? null,
      data.body ? new Date() : null
    ]
  );

  if (data.body) {
    const messageId = uuid();
    await pool.query(
      `
      INSERT INTO messages
        (id, thread_id, sender_id, body, sent_at)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [messageId, threadId, userId, data.body]
    );

    const message = await getMessageRow(messageId);
    const participants = await getParticipantUserIds(threadId);
    emitToUsers(participants, "message:new", { threadId, message });
    emitToUsers(participants, "thread:updated", { threadId });
  }

  return { id: threadId };
};

/**
 * Confirm the user participates in the thread and return the thread row.
 */
const assertThreadAccess = async (
  threadId: string,
  me: Participant
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM message_threads WHERE id = ?`,
    [threadId]
  );

  if (rows.length === 0) {
    throw new Error("Thread not found");
  }

  const thread = rows[0];
  const ok =
    me.role === "PROVIDER"
      ? thread.provider_id === me.providerId
      : thread.patient_id === me.patientId;

  if (!ok) {
    throw new Error("Forbidden");
  }

  return thread;
};

/**
 * Return a thread's messages and mark messages from the other party as read.
 */
export const getThreadMessagesService = async (
  userId: string,
  role: string,
  threadId: string
) => {
  const me = await resolveParticipant(userId, role);
  const thread = await assertThreadAccess(threadId, me);

  /* Mark inbound (not mine) messages as read */
  await pool.query(
    `
    UPDATE messages
    SET read_at = NOW()
    WHERE thread_id = ?
      AND sender_id <> ?
      AND read_at IS NULL
    `,
    [threadId, userId]
  );

  const [messages] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      id,
      thread_id,
      sender_id,
      body,
      sent_at,
      read_at,
      edited_at,
      (sender_id = ?) AS mine
    FROM messages
    WHERE thread_id = ?
    ORDER BY sent_at ASC
    `,
    [userId, threadId]
  );

  const [meta] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      t.id,
      t.subject,
      t.patient_id,
      t.provider_id,
      CONCAT(pat.first_name, ' ', pat.last_name) AS patient_name,
      prov.name AS provider_name
    FROM message_threads t
    JOIN patients pat ON t.patient_id = pat.id
    JOIN providers prov ON t.provider_id = prov.id
    WHERE t.id = ?
    `,
    [threadId]
  );

  return {
    thread: meta[0],
    messages: messages.map((m: RowDataPacket) => ({
      ...m,
      mine: !!m.mine
    }))
  };
};

/**
 * Append a message to a thread and bump its last_message_at.
 */
export const sendMessageService = async (
  userId: string,
  role: string,
  threadId: string,
  body: string
) => {
  if (!body || !body.trim()) {
    throw new Error("Message body is required");
  }

  const me = await resolveParticipant(userId, role);
  await assertThreadAccess(threadId, me);

  const id = uuid();

  await pool.query(
    `
    INSERT INTO messages
      (id, thread_id, sender_id, body, sent_at)
    VALUES (?, ?, ?, ?, NOW())
    `,
    [id, threadId, userId, body.trim()]
  );

  await pool.query(
    `UPDATE message_threads SET last_message_at = NOW() WHERE id = ?`,
    [threadId]
  );

  const message = await getMessageRow(id);
  const participants = await getParticipantUserIds(threadId);
  emitToUsers(participants, "message:new", { threadId, message });
  emitToUsers(participants, "thread:updated", { threadId });

  return { id, message };
};

/**
 * Edit a message. Only the original sender may edit, and only their own text.
 */
export const editMessageService = async (
  userId: string,
  role: string,
  messageId: string,
  body: string
) => {
  if (!body || !body.trim()) {
    throw new Error("Message body is required");
  }

  const me = await resolveParticipant(userId, role);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, thread_id, sender_id FROM messages WHERE id = ?`,
    [messageId]
  );

  if (rows.length === 0) {
    throw new Error("Message not found");
  }

  const existing = rows[0];

  /* Must participate in the thread AND be the author */
  await assertThreadAccess(existing.thread_id, me);
  if (existing.sender_id !== userId) {
    throw new Error("You can only edit your own messages");
  }

  await pool.query(
    `UPDATE messages SET body = ?, edited_at = NOW() WHERE id = ?`,
    [body.trim(), messageId]
  );

  const message = await getMessageRow(messageId);
  const participants = await getParticipantUserIds(existing.thread_id);
  emitToUsers(participants, "message:updated", {
    threadId: existing.thread_id,
    message
  });
  emitToUsers(participants, "thread:updated", {
    threadId: existing.thread_id
  });

  return { id: messageId, message };
};

/**
 * Delete a message. Only the original sender may delete their own message.
 */
export const deleteMessageService = async (
  userId: string,
  role: string,
  messageId: string
) => {
  const me = await resolveParticipant(userId, role);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, thread_id, sender_id FROM messages WHERE id = ?`,
    [messageId]
  );

  if (rows.length === 0) {
    throw new Error("Message not found");
  }

  const existing = rows[0];

  await assertThreadAccess(existing.thread_id, me);
  if (existing.sender_id !== userId) {
    throw new Error("You can only delete your own messages");
  }

  await pool.query(`DELETE FROM messages WHERE id = ?`, [messageId]);

  const participants = await getParticipantUserIds(existing.thread_id);
  emitToUsers(participants, "message:deleted", {
    threadId: existing.thread_id,
    messageId
  });
  emitToUsers(participants, "thread:updated", {
    threadId: existing.thread_id
  });

  return { id: messageId };
};
