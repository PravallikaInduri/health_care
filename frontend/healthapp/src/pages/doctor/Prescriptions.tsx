import { useEffect, useState } from "react";
import { Pill, Search as SearchIcon } from "lucide-react";
import toast from "react-hot-toast";

import {
  listProviderPrescriptions,
  type ProviderPrescription,
  type ProviderRxStatus,
} from "../../api/doctor.api";

const STATUS_FILTERS: {
  value: "" | ProviderRxStatus;
  label: string;
}[] = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DISPENSED", label: "Dispensed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-amber-50 text-amber-700 ring-amber-200",
  DISPENSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const DoctorPrescriptions = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | ProviderRxStatus>(
    ""
  );
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ProviderPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listProviderPrescriptions({
        search: search.trim() || undefined,
        status: status || undefined,
        page,
        limit: 10,
      });
      setRows(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to load prescriptions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Pill className="text-blue-600" />
        <h1 className="text-3xl font-bold">My Prescriptions</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm">
        <form
          onSubmit={handleSearchSubmit}
          className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <SearchIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient or medication…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(
                e.target.value as "" | ProviderRxStatus
              );
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Medication
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dose
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Frequency
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Refills
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Prescribed
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    Loading prescriptions…
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    You haven't created any prescriptions yet.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((rx) => (
                  <tr key={rx.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">
                        {rx.first_name} {rx.last_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        MRN {rx.mrn || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">
                        {rx.medication_name || "—"}
                      </p>
                      {rx.medication_generic && (
                        <p className="text-xs text-slate-400">
                          {rx.medication_generic}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {rx.dose || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {rx.frequency || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {rx.refills_used}/{rx.refills_allowed}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {new Date(
                        rx.prescribed_at
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                          STATUS_STYLES[rx.status] ||
                          "bg-slate-50 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {rx.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>
            {total} prescription{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-3 py-1.5">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorPrescriptions;
