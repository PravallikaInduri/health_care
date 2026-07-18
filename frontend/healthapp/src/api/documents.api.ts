import api from "./axios";
import { getToken } from "../utils/auth";

export type DocumentType = "REPORT" | "SCAN" | "INSURANCE" | "CONSENT";

export interface PatientDocument {
  id: string;
  patient_id: string;
  type: DocumentType;
  file_name: string | null;
  mime: string | null;
  uploaded_at: string | null;
  size_bytes: number | null;
}

export const listDocuments = () =>
  api.get<{ success: boolean; data: PatientDocument[] }>(
    "/healthcare/documents"
  );

export const uploadDocument = (type: DocumentType, file: File) => {
  const form = new FormData();
  form.append("type", type);
  form.append("file", file);
  return api.post<{ success: boolean; data: { id: string } }>(
    "/healthcare/documents",
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};

export const deleteDocument = (id: string) =>
  api.delete<{ success: boolean; message: string }>(
    `/healthcare/documents/${id}`
  );

/**
 * Open a document in a new tab. Because the download route is auth-guarded we
 * fetch it as a blob (the Axios interceptor attaches the token) and create a
 * temporary object URL.
 */
export const openDocument = async (id: string) => {
  const res = await api.get(`/healthcare/documents/${id}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank");
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
};

/* Exposed in case a direct link is ever needed (token must be appended). */
export const downloadUrl = (id: string) =>
  `${api.defaults.baseURL}/healthcare/documents/${id}/download?token=${getToken()}`;
