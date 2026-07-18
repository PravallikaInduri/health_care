import { useEffect, useState } from "react";
import { Pill, Check, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  getProviderRefills,
  decideRefill,
  type ProviderRefillRequest,
} from "../../api/refills.api";

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      } as any)
    : "—";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;
type Filter = (typeof FILTERS)[number];

const RefillRequests = () => {
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [items, setItems] = useState<ProviderRefillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getProviderRefills(filter === "ALL" ? undefined : filter)
      .then((res) => setItems(res.data.data || []))
      .catch((err) =>
        toast.error(
          err?.response?.data?.message ||
            "Failed to load refill requests"
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const decide = async (
    id: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    try {
      setBusyId(id);
      await decideRefill(id, status);
      toast.success(`Refill ${status.toLowerCase()}`);
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to update request"
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Refill Requests
        </h1>
        <p className="text-sm text-slate-500">
          Review and decide on patient prescription refills
        </p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
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
                  Medication
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
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Loading requests…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No refill requests.
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {r.patient_name || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Pill size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            {r.medication_name || "Medication"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {r.dose || ""}{" "}
                            {r.frequency ? `· ${r.frequency}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(r.requested_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                          STATUS_STYLES[r.status]
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {r.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => decide(r.id, "APPROVED")}
                            disabled={busyId === r.id}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium disabled:opacity-50"
                          >
                            {busyId === r.id ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Check size={14} />
                            )}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(r.id, "REJECTED")}
                            disabled={busyId === r.id}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-medium disabled:opacity-50"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Decided
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RefillRequests;
