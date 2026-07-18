import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Pill,
  User,
  Stethoscope,
  RefreshCw,
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getPharmacyPrescription,
  dispensePrescription,
  markPrescriptionPaid,
  type PrescriptionDetail as RxDetail,
} from "../../api/pharmacy.api";
import { formatDoctorName } from "../../utils/doctorName";

const money = (n: number | string | null | undefined) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-amber-50 text-amber-700 ring-amber-200",
  DISPENSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const REFILL_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const PharmacyPrescriptionDetail = () => {
  const { id } = useParams();
  const [rx, setRx] = useState<RxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getPharmacyPrescription(id);
      setRx(res.data.data);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to load prescription"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDispense = async () => {
    if (!rx) return;
    if (rx.status !== "ACTIVE") return;
    setDispensing(true);
    try {
      await dispensePrescription(rx.id);
      toast.success("Prescription dispensed");
      void load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to dispense prescription"
      );
    } finally {
      setDispensing(false);
    }
  };

  const handlePaid = async () => {
    if (!rx) return;
    setPaying(true);
    try {
      await markPrescriptionPaid(rx.id);
      toast.success("Payment recorded — added to earnings");
      void load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to record payment"
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400">
        Loading prescription…
      </div>
    );
  }

  if (!rx) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-rose-500">
        Prescription not found.
      </div>
    );
  }

  const remaining = Math.max(
    0,
    (rx.refills_allowed ?? 0) - (rx.refills_used ?? 0)
  );

  return (
    <div className="space-y-6">
      <Link
        to="/pharmacy/prescriptions"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={16} /> Back to prescriptions
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-start gap-4 flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Pill size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {rx.medication_name || "Unknown medication"}
            </h1>
            {rx.medication_generic && (
              <p className="text-slate-500">
                {rx.medication_generic}
              </p>
            )}
            <span
              className={`inline-flex mt-2 items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                STATUS_STYLES[rx.status] ||
                "bg-slate-50 text-slate-700 ring-slate-200"
              }`}
            >
              {rx.status}
            </span>
          </div>
        </div>

        {rx.status === "ACTIVE" && (
          <button
            onClick={handleDispense}
            disabled={dispensing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium disabled:opacity-60"
          >
            <CheckCircle2 size={16} />
            {dispensing
              ? "Dispensing…"
              : "Dispense Medication"}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <IndianRupee size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Price</p>
            <p className="text-2xl font-bold text-slate-800">
              {rx.price != null ? (
                money(rx.payment_status === "PAID" ? rx.amount : rx.price)
              ) : (
                <span className="text-base font-medium text-amber-500">
                  Not priced — add it in your Medicine Catalogue
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {rx.payment_status === "PAID" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={15} /> Paid
            </span>
          ) : (
            <>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-rose-100 text-rose-700">
                Unpaid
              </span>
              <button
                onClick={handlePaid}
                disabled={paying || rx.price == null}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium disabled:opacity-60"
              >
                <IndianRupee size={15} />
                {paying ? "Saving…" : "Mark as Paid"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <User size={14} /> Patient
          </h3>
          <p className="text-lg font-medium text-slate-800">
            {rx.first_name} {rx.last_name}
          </p>
          <p className="text-sm text-slate-500">
            MRN {rx.mrn || "—"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Stethoscope size={14} /> Prescribing Provider
          </h3>
          <p className="text-lg font-medium text-slate-800">
            {rx.provider_name
              ? formatDoctorName(rx.provider_name)
              : "—"}
          </p>
          <p className="text-sm text-slate-500">
            Encounter ID:{" "}
            <span className="font-mono text-xs">
              {rx.encounter_id?.slice(0, 8) || "—"}…
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Medication Information
        </h3>
        <dl className="grid sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <div>
            <dt className="text-slate-400">Dose</dt>
            <dd className="font-medium text-slate-800">
              {rx.dose || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Frequency</dt>
            <dd className="font-medium text-slate-800">
              {rx.frequency || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Duration</dt>
            <dd className="font-medium text-slate-800">
              {rx.duration_days
                ? `${rx.duration_days} days`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Prescribed at</dt>
            <dd className="font-medium text-slate-800">
              {new Date(rx.prescribed_at).toLocaleString()}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400">Instructions</dt>
            <dd className="font-medium text-slate-800 whitespace-pre-wrap">
              {rx.instructions || "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Refill Information
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-blue-50 text-blue-700 p-4">
            <p className="text-xs uppercase tracking-wide">
              Allowed
            </p>
            <p className="text-2xl font-bold">
              {rx.refills_allowed}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 text-amber-700 p-4">
            <p className="text-xs uppercase tracking-wide">
              Used
            </p>
            <p className="text-2xl font-bold">
              {rx.refills_used}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 text-emerald-700 p-4">
            <p className="text-xs uppercase tracking-wide">
              Remaining
            </p>
            <p className="text-2xl font-bold">{remaining}</p>
          </div>
        </div>

        {rx.refills.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <RefreshCw size={14} className="text-blue-600" />
              Refill request history
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-medium text-slate-600">
                      Requested
                    </th>
                    <th className="px-3 py-2 font-medium text-slate-600">
                      Status
                    </th>
                    <th className="px-3 py-2 font-medium text-slate-600">
                      Decided
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rx.refills.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-slate-600">
                        {new Date(
                          r.requested_at
                        ).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${
                            REFILL_STYLES[r.status] ||
                            "bg-slate-50 text-slate-700 ring-slate-200"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-xs">
                        {r.decided_at
                          ? new Date(
                              r.decided_at
                            ).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {rx.dispensed_at && (
        <div className="bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm">
          Last dispensed at{" "}
          <strong>
            {new Date(rx.dispensed_at).toLocaleString()}
          </strong>
          .
        </div>
      )}
    </div>
  );
};

export default PharmacyPrescriptionDetail;
