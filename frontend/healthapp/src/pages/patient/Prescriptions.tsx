import { useEffect, useState } from "react";
import { Pill, RefreshCw, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  getMyPrescriptions,
  requestRefill,
  type PatientPrescription,
} from "../../api/refills.api";

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        dateStyle: "medium",
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
  APPROVED: "At pharmacy",
  REJECTED: "Rejected",
  DISPENSED: "Dispensed",
};

const Prescriptions = () => {
  const [items, setItems] = useState<PatientPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getMyPrescriptions()
      .then((res) => setItems(res.data.data || []))
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to load prescriptions"
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRefill = async (rx: PatientPrescription) => {
    try {
      setBusyId(rx.id);
      await requestRefill(rx.id);
      toast.success("Refill requested");
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to request refill"
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Prescriptions
        </h1>
        <p className="text-sm text-slate-500">
          Your medications and refill requests
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400">
          Loading prescriptions…
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Pill size={28} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">
            No prescriptions yet
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Medications prescribed during your visits will appear here.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((rx) => {
            const inProgress =
              rx.last_refill_status === "PENDING" ||
              rx.last_refill_status === "APPROVED";
            const canRequest = !inProgress;
            return (
              <div
                key={rx.id}
                className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center shrink-0">
                      <Pill size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {rx.medication_name || "Medication"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {rx.generic_name || ""}
                      </p>
                    </div>
                  </div>
                  {rx.last_refill_status && (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ring-1 ${
                        STATUS_STYLES[rx.last_refill_status]
                      }`}
                    >
                      {STATUS_LABELS[rx.last_refill_status] ||
                        rx.last_refill_status}
                    </span>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-400">Dose</dt>
                    <dd className="text-slate-700 font-medium">
                      {rx.dose || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      Frequency
                    </dt>
                    <dd className="text-slate-700 font-medium">
                      {rx.frequency || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      Prescribed by
                    </dt>
                    <dd className="text-slate-700 font-medium truncate">
                      {rx.provider_name || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      Prescribed on
                    </dt>
                    <dd className="text-slate-700 font-medium">
                      {formatDate(rx.prescribed_at)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-slate-400">Pharmacy</dt>
                    <dd className="text-slate-700 font-medium truncate">
                      {rx.pharmacy_facility_name || "Not yet routed"}
                    </dd>
                  </div>
                </dl>

                {rx.instructions && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    {rx.instructions}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    {inProgress
                      ? rx.last_refill_status === "PENDING"
                        ? "Refill awaiting doctor approval"
                        : "Approved — at pharmacy"
                      : "Request a refill anytime; your doctor approves it"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRefill(rx)}
                    disabled={!canRequest || busyId === rx.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busyId === rx.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    {rx.last_refill_status === "PENDING"
                      ? "Awaiting doctor"
                      : rx.last_refill_status === "APPROVED"
                      ? "At pharmacy"
                      : "Request Refill"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Prescriptions;
