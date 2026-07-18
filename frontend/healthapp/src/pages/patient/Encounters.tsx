import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  Stethoscope,
  Building2,
  CalendarDays,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getEncounters,
  getEncounterById,
  type PatientEncounter,
  type PaginationMeta,
} from "../../api/patient.api";
import { formatDoctorName } from "../../utils/doctorName";

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const Encounters = () => {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [encounters, setEncounters] = useState<
    PatientEncounter[]
  >([]);
  const [pagination, setPagination] =
    useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const params = useMemo(
    () => ({
      search: search || undefined,
      page,
      limit,
    }),
    [search, page, limit]
  );

  useEffect(() => {
    setLoading(true);
    getEncounters(params)
      .then((res) => {
        setEncounters(res.data.data || []);
        setPagination(res.data.pagination);
      })
      .catch(() => {
        toast.error("Failed to load encounters");
      })
      .finally(() => setLoading(false));
  }, [params]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleView = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await getEncounterById(id);
      setDetail(res.data.data);
    } catch {
      toast.error("Failed to load encounter");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Visit History
        </h1>
        <p className="text-sm text-slate-500">
          Your past visits, diagnoses and clinical notes
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <form
          onSubmit={onSearchSubmit}
          className="grid md:grid-cols-12 gap-3"
        >
          <div className="md:col-span-10 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(e) =>
                setSearchInput(e.target.value)
              }
              placeholder="Search by doctor, complaint or facility"
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="md:col-span-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Provider
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Facility
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Diagnosis
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
                    Loading visits…
                  </td>
                </tr>
              )}

              {!loading && encounters.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    You have no past visits yet.
                  </td>
                </tr>
              )}

              {!loading &&
                encounters.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-4 text-slate-700">
                      {formatDateTime(e.started_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">
                        {formatDoctorName(e.provider_name)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {e.provider_specialty || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {e.facility_name || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-sm truncate">
                      {e.diagnoses ||
                        e.chief_complaint ||
                        "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleView(e.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                      >
                        <FileText size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of{" "}
              {pagination.totalPages} · {pagination.total}{" "}
              visits
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-50"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                onClick={() =>
                  setPage((p) =>
                    pagination
                      ? Math.min(
                          pagination.totalPages,
                          p + 1
                        )
                      : p
                  )
                }
                disabled={
                  pagination.page >= pagination.totalPages
                }
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-50"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-800">
                Visit Details
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

            <div className="px-6 py-5 space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                  <CalendarDays
                    size={18}
                    className="text-blue-600 mt-0.5"
                  />
                  <div>
                    <p className="text-xs text-slate-400">
                      Date & Time
                    </p>
                    <p className="font-medium text-slate-800">
                      {formatDateTime(detail.started_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                  <Stethoscope
                    size={18}
                    className="text-blue-600 mt-0.5"
                  />
                  <div>
                    <p className="text-xs text-slate-400">
                      Provider
                    </p>
                    <p className="font-medium text-slate-800">
                      {formatDoctorName(detail.provider_name)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {detail.provider_specialty || ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 sm:col-span-2">
                  <Building2
                    size={18}
                    className="text-blue-600 mt-0.5"
                  />
                  <div>
                    <p className="text-xs text-slate-400">
                      Facility
                    </p>
                    <p className="font-medium text-slate-800">
                      {detail.facility_name || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Chief Complaint
                </p>
                <p className="font-medium text-slate-800">
                  {detail.chief_complaint || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-2">
                  Diagnoses
                </p>
                {detail.diagnoses &&
                detail.diagnoses.length > 0 ? (
                  <ul className="space-y-2">
                    {detail.diagnoses.map((d: any) => (
                      <li
                        key={d.id}
                        className="p-3 rounded-xl border border-slate-100 bg-white"
                      >
                        <p className="font-medium text-slate-800">
                          {d.description || "—"}
                        </p>
                        <div className="text-xs text-slate-400 mt-1 flex gap-3">
                          {d.icd10_code && (
                            <span>ICD-10: {d.icd10_code}</span>
                          )}
                          {d.is_chronic ? (
                            <span className="text-amber-700">
                              Chronic
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">—</p>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Notes
                </p>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {detail.soap_note || "—"}
                </p>
              </div>

              {detail.vitals && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    Vitals
                  </p>
                  <pre className="text-xs bg-slate-50 p-3 rounded-xl overflow-x-auto">
                    {JSON.stringify(detail.vitals, null, 2)}
                  </pre>
                </div>
              )}
            </div>

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

      {detailLoading && !detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30">
          <div className="bg-white px-6 py-4 rounded-xl text-sm text-slate-600">
            Loading…
          </div>
        </div>
      )}
    </div>
  );
};

export default Encounters;
