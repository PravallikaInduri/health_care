import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { getPatientIdByUser } from "../utils/identity";

const DOCUMENT_TYPES = ["REPORT", "SCAN", "INSURANCE", "CONSENT"] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

const isDocumentType = (v: unknown): v is DocumentType =>
  typeof v === "string" &&
  (DOCUMENT_TYPES as readonly string[]).includes(v);

export interface UploadInput {
  type: string;
  fileName: string;
  mime: string;
  buffer: Buffer;
}

/**
 * Persist an uploaded document for the patient behind `userId`. The binary is
 * stored in `documents.file_data` (LONGBLOB). A sha256 of the bytes is kept to
 * de-duplicate identical uploads (enforced by a UNIQUE index on the column).
 */
export const uploadDocumentService = async (
  userId: string,
  input: UploadInput
) => {
  if (!isDocumentType(input.type)) {
    throw new Error(
      "Document type must be one of REPORT, SCAN, INSURANCE, CONSENT"
    );
  }

  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }

  const sha256 = crypto
    .createHash("sha256")
    .update(input.buffer)
    .digest("hex");

  const id = uuid();

  try {
    await pool.query(
      `
      INSERT INTO documents
        (id, patient_id, type, file_name, url, file_data, uploaded_by, uploaded_at, mime, sha256)
      VALUES (?, ?, ?, ?, NULL, ?, ?, NOW(), ?, ?)
      `,
      [
        id,
        patientId,
        input.type,
        input.fileName,
        input.buffer,
        userId,
        input.mime,
        sha256
      ]
    );
  } catch (e) {
    if ((e as { code?: string }).code === "ER_DUP_ENTRY") {
      throw new Error("This exact file has already been uploaded");
    }
    throw e;
  }

  return { id };
};

/**
 * List a patient's document metadata (never the binary payload).
 */
export const listDocumentsService = async (userId: string) => {
  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      id,
      patient_id,
      type,
      file_name,
      mime,
      uploaded_at,
      OCTET_LENGTH(file_data) AS size_bytes
    FROM documents
    WHERE patient_id = ?
    ORDER BY uploaded_at DESC
    `,
    [patientId]
  );

  return rows;
};

/**
 * Fetch a single document's binary for download, scoped to its owner.
 */
export const getDocumentFileService = async (
  userId: string,
  documentId: string
) => {
  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT file_name, mime, file_data, url
    FROM documents
    WHERE id = ? AND patient_id = ?
    `,
    [documentId, patientId]
  );

  if (rows.length === 0) {
    throw new Error("Document not found");
  }

  return rows[0];
};

export const deleteDocumentService = async (
  userId: string,
  documentId: string
) => {
  const patientId = await getPatientIdByUser(userId);
  if (!patientId) {
    throw new Error("No patient record linked to this account");
  }

  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM documents WHERE id = ? AND patient_id = ?`,
    [documentId, patientId]
  );

  if (result.affectedRows === 0) {
    throw new Error("Document not found");
  }

  return { success: true };
};
