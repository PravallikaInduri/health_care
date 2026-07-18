import { useEffect, useState } from "react";
import { RefreshCw, Pill } from "lucide-react";
import toast from "react-hot-toast";

import { getMyRefills, type RefillRequest } from "../../api/refills.api";

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
  DISPENSED: "bg-blue-50 text-blue-700 ring-blue-200",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting doctor",
  APPROVED: "Approved — at pharmacy",
  REJECTED: "Rejected",
  DISPENSED: "Dispensed",
};

const RefillRequests = () => {
  const [items, setItems] = useState<RefillRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyRefills()
      .then((res) => setItems(res.data.data || []))
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to load refill requests"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Refill Requests
        </h1>
        <p className="text-sm text-slate-500">
          Track the status of refills you've requested. Request new refills
          from the Prescriptions page.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Medication
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Requested
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Decided
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
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Loading refill requests…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    <RefreshCw
                      size={28}
                      className="mx-auto mb-2 text-slate-300"
                    />
                    No refill requests yet.
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Pill size={16} />
                        </div>
                        <span className="font-medium text-slate-800">
                          {r.medication_name || "Medication"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(r.requested_at)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(r.decided_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                          STATUS_STYLES[r.status] ||
                          "bg-slate-50 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
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
