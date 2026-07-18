import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Eye,
  X,
  Loader2,
  FileText,
  FlaskConical,
  Download,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getMyPatients,
  getProviderPatientDetail,
  openProviderPatientDocument,
  openProviderLabResult,
  type ProviderPatient,
  type ProviderPatientDetail,
} from "../../api/doctor.api";

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

const STATUS_STYLES: Record<string, string> = {
  ORDERED: "bg-amber-50 text-amber-700 ring-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const Patients = () => {
  const [patients, setPatients] = useState<ProviderPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ProviderPatientDetail | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getMyPatients()
      .then((data) => setPatients(data))
      .catch((err: any) =>
        toast.error(
          err?.response?.data?.message || "Failed to load patients"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      [
        `${p.first_name} ${p.last_name}`,
        p.mrn,
        p.email || "",
        p.phone || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [patients, search]);

  const openDetail = async (patientId: string) => {
    try {
      setDetailLoading(true);
      const data = await getProviderPatientDetail(patientId);
      setDetail(data);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load patient"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const viewDocument = async (patientId: string, documentId: string) => {
    try {
      await openProviderPatientDocument(patientId, documentId);
    } catch {
      toast.error("Failed to open document");
    }
  };

  const viewResult = async (resultId: string) => {
    try {
      await openProviderLabResult(resultId);
    } catch {
      toast.error("Failed to open result");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          My Patients
        </h1>
        <p className="text-sm text-slate-500">
          People under your care — view their details, documents
          and uploaded lab results
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, MRN, email or phone"
            className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  MRN
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Visits
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last Visit
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Action
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
                    Loading patients…
                  </td>
                </tr>
              )}
              {!loading && filteredPatients.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    {patients.length === 0
                      ? "No patients yet."
                      : "No patients match your search."}
                  </td>
                </tr>
              )}
              {!loading &&
                filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {p.email || p.phone || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {p.mrn}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {p.appointment_count}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(p.last_visit)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openDetail(p.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-800">
                {detail
                  ? `${detail.patient.first_name} ${detail.patient.last_name}`
                  : "Loading…"}
              </h3>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="py-16 flex justify-center text-slate-400">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <div className="px-6 py-5 space-y-6 text-sm">
                {/* Demographics */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-400">MRN</p>
                    <p className="font-medium text-slate-800">
                      {detail.patient.mrn}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-400">
                      Date of Birth
                    </p>
                    <p className="font-medium text-slate-800">
                      {formatDate(detail.patient.dob)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-400">Sex</p>
                    <p className="font-medium text-slate-800">
                      {detail.patient.sex || "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="font-medium text-slate-800">
                      {detail.patient.phone || "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 sm:col-span-2">
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="font-medium text-slate-800">
                      {detail.patient.email || "—"}
                    </p>
                  </div>
                </div>

                {/* Lab orders */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2">
                    <FlaskConical size={14} /> Lab Orders
                  </p>
                  {detail.labOrders.length === 0 ? (
                    <p className="text-slate-500">
                      No lab orders for this patient.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {detail.labOrders.map((order) => (
                        <div
                          key={order.id}
                          className="rounded-xl border border-slate-100 p-4"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="font-medium text-slate-800">
                              Order #{order.id.slice(0, 8)}
                              <span className="text-slate-400 font-normal">
                                {" · "}
                                {formatDate(order.ordered_at)}
                              </span>
                            </p>
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${
                                STATUS_STYLES[
                                  (order.status || "").toUpperCase()
                                ] ||
                                "bg-slate-50 text-slate-700 ring-slate-200"
                              }`}
                            >
                              {order.status || "—"}
                            </span>
                          </div>

                          <div className="mb-2">
                            <p className="text-xs text-slate-400 mb-1">
                              Requested tests
                            </p>
                            {order.tests.length === 0 ? (
                              <p className="text-slate-500">—</p>
                            ) : (
                              <ul className="flex flex-wrap gap-2">
                                {order.tests.map((t) => (
                                  <li
                                    key={t.id}
                                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs"
                                    title={t.instructions || ""}
                                  >
                                    {t.test_name}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div>
                            <p className="text-xs text-slate-400 mb-1">
                              Lab results
                            </p>
                            {order.uploads.length === 0 ? (
                              <p className="text-slate-400 italic">
                                Awaiting lab result
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {order.uploads.map((u) => (
                                  <li
                                    key={u.id}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="font-medium text-slate-800 truncate">
                                        {u.test_name
                                          ? `${u.test_name} — `
                                          : ""}
                                        {u.file_name}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {formatSize(u.size_bytes)} ·{" "}
                                        {formatDate(u.uploaded_at)}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => viewResult(u.id)}
                                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium"
                                    >
                                      <Download size={13} /> Open
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2">
                    <FileText size={14} /> Documents
                  </p>
                  {detail.documents.length === 0 ? (
                    <p className="text-slate-500">
                      No documents uploaded.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {detail.documents.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {doc.file_name || "Untitled"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {doc.type} · {formatSize(doc.size_bytes)}{" "}
                              · {formatDate(doc.uploaded_at)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              viewDocument(detail.patient.id, doc.id)
                            }
                            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-medium"
                          >
                            <Eye size={13} /> View
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="px-6 py-4 flex justify-end border-t border-slate-100 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
