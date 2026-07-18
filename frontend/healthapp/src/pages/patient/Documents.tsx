import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  X,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  openDocument,
  type PatientDocument,
  type DocumentType,
} from "../../api/documents.api";

const TYPE_OPTIONS: DocumentType[] = [
  "REPORT",
  "SCAN",
  "INSURANCE",
  "CONSENT",
];

const TYPE_STYLES: Record<string, string> = {
  REPORT: "bg-blue-50 text-blue-700 ring-blue-200",
  SCAN: "bg-violet-50 text-violet-700 ring-violet-200",
  INSURANCE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CONSENT: "bg-amber-50 text-amber-700 ring-amber-200",
};

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        dateStyle: "medium",
      } as any)
    : "—";

const formatSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Documents = () => {
  const [docs, setDocs] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [type, setType] = useState<DocumentType>("REPORT");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    listDocuments()
      .then((res) => setDocs(res.data.data || []))
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to load documents"
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please choose a file");
      return;
    }
    try {
      setUploading(true);
      await uploadDocument(type, file);
      toast.success("Document uploaded");
      setUploadOpen(false);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to upload document"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc: PatientDocument) => {
    try {
      await openDocument(doc.id);
    } catch {
      toast.error("Failed to open document");
    }
  };

  const handleDelete = async (doc: PatientDocument) => {
    if (!window.confirm(`Delete "${doc.file_name}"?`)) return;
    try {
      await deleteDocument(doc.id);
      toast.success("Document deleted");
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to delete document"
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Documents
          </h1>
          <p className="text-sm text-slate-500">
            Upload and manage your reports, scans and consent forms
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          <Upload size={16} /> Upload
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Size
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Uploaded
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Loading documents…
                  </td>
                </tr>
              )}
              {!loading && docs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No documents yet. Click{" "}
                    <span className="font-medium text-slate-600">
                      Upload
                    </span>{" "}
                    to add one.
                  </td>
                </tr>
              )}
              {!loading &&
                docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText size={18} />
                        </div>
                        <p className="font-medium text-slate-800 truncate max-w-[220px]">
                          {doc.file_name || "Untitled"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                          TYPE_STYLES[doc.type] ||
                          "bg-slate-50 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {doc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatSize(doc.size_bytes)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleView(doc)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-medium"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">
                Upload Document
              </h3>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Document Type
                </label>
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as DocumentType)
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  File
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={(e) =>
                    setFile(e.target.files?.[0] ?? null)
                  }
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Max 10 MB.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
                >
                  {uploading && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
