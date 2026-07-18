import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  RefreshCw,
  Search as SearchIcon,
  PackageCheck,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  listRefillRequests,
  dispenseRefillRequest,
  type RefillRequest,
} from "../../api/pharmacy.api";

type StatusFilter = "" | "PENDING" | "APPROVED" | "REJECTED" | "DISPENSED";

const STATUS_FILTERS: {
  value: StatusFilter;
  label: string;
}[] = [
  { value: "APPROVED", label: "To dispense" },
  { value: "DISPENSED", label: "Dispensed" },
  { value: "PENDING", label: "Awaiting doctor" },
  { value: "REJECTED", label: "Rejected" },
  { value: "", label: "All statuses" },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  DISPENSED: "bg-blue-50 text-blue-700 ring-blue-200",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting doctor",
  APPROVED: "Approved — to dispense",
  REJECTED: "Rejected",
  DISPENSED: "Dispensed",
};

const PharmacyRefillRequests = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus =
    (searchParams.get("status") as StatusFilter) || "APPROVED";

  const [search, setSearch] = useState(
    searchParams.get("search") || ""
  );
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RefillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [dispensingId, setDispensingId] = useState<string | null>(
    null
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await listRefillRequests({
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
          "Failed to load refill requests"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (search.trim()) next.set("search", search.trim());
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load();
  };

  const handleDispense = async (rr: RefillRequest) => {
    if (rr.status !== "APPROVED") return;
    setDispensingId(rr.id);
    try {
      await dispenseRefillRequest(rr.id);
      toast.success("Refill dispensed");
      void load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to dispense refill"
      );
    } finally {
      setDispensingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <RefreshCw className="text-blue-600" />
          <h1 className="text-3xl font-bold">Refill Requests</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 ml-9">
          Dispense refills the doctor has approved. Requests still
          "Awaiting doctor" are not yet ready.
        </p>
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
              setStatus(e.target.value as StatusFilter);
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
                  Allowed
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Used
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Remaining
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Requested
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
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
                    colSpan={8}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    Loading refill requests…
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    {search.trim() || status
                      ? "No refill requests match your filters."
                      : "No refill requests pending."}
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((rr) => {
                  const remaining = Math.max(
                    0,
                    (rr.refills_allowed ?? 0) -
                      (rr.refills_used ?? 0)
                  );
                  return (
                    <tr
                      key={rr.id}
                      className="hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">
                          {rr.first_name} {rr.last_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          MRN {rr.mrn || "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">
                          {rr.medication_name || "—"}
                        </p>
                        {rr.medication_generic && (
                          <p className="text-xs text-slate-400">
                            {rr.medication_generic}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {rr.refills_allowed}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {rr.refills_used}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {remaining}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {new Date(
                          rr.requested_at
                        ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                            STATUS_STYLES[rr.status] ||
                            "bg-slate-50 text-slate-700 ring-slate-200"
                          }`}
                        >
                          {STATUS_LABELS[rr.status] || rr.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {rr.status === "APPROVED" ? (
                          <button
                            disabled={dispensingId === rr.id}
                            onClick={() => handleDispense(rr)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                          >
                            <PackageCheck size={14} />
                            {dispensingId === rr.id
                              ? "Dispensing…"
                              : "Dispense"}
                          </button>
                        ) : rr.status === "PENDING" ? (
                          <span className="text-xs text-amber-600">
                            Awaiting doctor approval
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {rr.status === "DISPENSED"
                              ? "Dispensed"
                              : "Decided"}{" "}
                            {rr.decided_at
                              ? new Date(
                                  rr.decided_at
                                ).toLocaleDateString()
                              : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>
            {total} request{total === 1 ? "" : "s"}
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

export default PharmacyRefillRequests;
