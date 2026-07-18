import { useEffect, useState } from "react";
import {
  Receipt,
  CreditCard,
  X,
  Loader2,
  CheckCircle2,
  FlaskConical,
  Pill,
  CalendarClock,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getMyBills,
  getMyAppointmentPayments,
  getMyLabCharges,
  getMyPharmacyCharges,
  getBill,
  payBill,
  type Bill,
  type BillDetail,
  type AppointmentPayment,
  type LabCharge,
  type PharmacyCharge,
} from "../../api/billing.api";

type Category = "ALL" | "CONSULTATION" | "LAB" | "PHARMACY";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "CONSULTATION", label: "Consultations" },
  { value: "LAB", label: "Labs" },
  { value: "PHARMACY", label: "Pharmacy" },
];

const money = (value: string | number | null) => {
  const n = Number(value ?? 0);
  return `₹${n.toFixed(2)}`;
};

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        dateStyle: "medium",
      } as any)
    : "—";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-700 ring-amber-200",
  UNPAID: "bg-rose-50 text-rose-700 ring-rose-200",
};

const Billing = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [appointments, setAppointments] = useState<AppointmentPayment[]>([]);
  const [labCharges, setLabCharges] = useState<LabCharge[]>([]);
  const [pharmacyCharges, setPharmacyCharges] = useState<PharmacyCharge[]>([]);
  const [category, setCategory] = useState<Category>("ALL");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      getMyBills(),
      getMyAppointmentPayments(),
      getMyLabCharges(),
      getMyPharmacyCharges(),
    ])
      .then(([billsRes, apptRes, labRes, pharmRes]) => {
        setBills(billsRes.data.data || []);
        setAppointments(apptRes.data.data || []);
        setLabCharges(labRes.data.data || []);
        setPharmacyCharges(pharmRes.data.data || []);
      })
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to load bills"
        )
      )
      .finally(() => setLoading(false));
  };

  const sum = (arr: { amount?: string | number | null }[]) =>
    arr.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const consultationSpend =
    appointments
      .filter((a) => a.payment_status === "PAID")
      .reduce((s, a) => s + Number(a.consultation_fee ?? 0), 0) +
    bills
      .filter((b) => b.status === "PAID")
      .reduce((s, b) => s + Number(b.patient_pay ?? 0), 0);
  const labSpend = sum(labCharges);
  const pharmacySpend = sum(pharmacyCharges);

  useEffect(load, []);

  const openDetail = (id: string) => {
    setLoadingDetail(true);
    getBill(id)
      .then((res) => setDetail(res.data.data))
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to load bill"
        )
      )
      .finally(() => setLoadingDetail(false));
  };

  const outstanding = (b: BillDetail) =>
    Math.max(
      0,
      Number(b.patient_pay ?? 0) - Number(b.amount_paid ?? 0)
    );

  const handlePay = async () => {
    if (!detail) return;
    try {
      setPaying(true);
      const res = await payBill(detail.id);
      toast.success(
        `Payment successful (${res.data.data.gateway_txn_id})`
      );
      const refreshed = await getBill(detail.id);
      setDetail(refreshed.data.data);
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Payment failed"
      );
    } finally {
      setPaying(false);
    }
  };

  const showConsultations = category === "ALL" || category === "CONSULTATION";
  const showLabs = category === "ALL" || category === "LAB";
  const showPharmacy = category === "ALL" || category === "PHARMACY";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Billing & Payments
        </h1>
        <p className="text-sm text-slate-500">
          Review what you've spent on consultations, labs and pharmacy
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Spent",
            value: consultationSpend + labSpend + pharmacySpend,
            color: "text-blue-600 bg-blue-100",
            icon: Receipt,
          },
          {
            label: "Consultations",
            value: consultationSpend,
            color: "text-sky-600 bg-sky-100",
            icon: CalendarClock,
          },
          {
            label: "Labs",
            value: labSpend,
            color: "text-cyan-600 bg-cyan-100",
            icon: FlaskConical,
          },
          {
            label: "Pharmacy",
            value: pharmacySpend,
            color: "text-emerald-600 bg-emerald-100",
            icon: Pill,
          },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl shadow-sm p-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}
              >
                <Icon size={18} />
              </div>
              <p className="mt-3 text-xl font-bold text-slate-800">
                {money(c.value)}
              </p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
              category === c.value
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {showConsultations && (
      <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Provider
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Your Share
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
                    Loading bills…
                  </td>
                </tr>
              )}
              {!loading && bills.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No bills yet.
                  </td>
                </tr>
              )}
              {!loading &&
                bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Receipt size={18} />
                        </div>
                        <p className="font-medium text-slate-800">
                          {b.provider_name || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(b.generated_at)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {money(b.patient_pay)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                          STATUS_STYLES[b.status || "UNPAID"] ||
                          "bg-slate-50 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {b.status || "UNPAID"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openDetail(b.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <CalendarClock size={18} className="text-blue-600" />
          Appointment Payments
        </h2>
        <p className="text-sm text-slate-500 mb-3">
          Consultation fees for your booked appointments
        </p>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Doctor
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Hospital
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && appointments.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      No appointment payments yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {a.provider_name || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {a.facility_name || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(a.scheduled_at)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {money(a.consultation_fee)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                            a.payment_status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-amber-50 text-amber-700 ring-amber-200"
                          }`}
                        >
                          {a.payment_status === "PAID" ? "PAID" : "PENDING"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {a.gateway_txn_id || "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </>
      )}

      {showLabs && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FlaskConical size={18} className="text-cyan-600" />
            Lab Charges
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            What you've paid for lab tests
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tests
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lab
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && labCharges.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        No lab charges yet.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    labCharges.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {l.tests || "Lab order"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {l.lab_name || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(l.paid_at)}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {money(l.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showPharmacy && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Pill size={18} className="text-emerald-600" />
            Pharmacy Charges
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            What you've paid for medicines
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Medicine
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Pharmacy
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && pharmacyCharges.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        No pharmacy charges yet.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    pharmacyCharges.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {p.medication_name || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {p.pharmacy_name || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(p.paid_at)}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {money(p.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(detail || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">
                Bill Details
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

            {loadingDetail || !detail ? (
              <div className="p-10 text-center text-slate-400">
                <Loader2 className="animate-spin mx-auto" />
              </div>
            ) : (
              <div className="px-6 py-5 space-y-5">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-400">Subtotal</dt>
                    <dd className="text-slate-700 font-medium">
                      {money(detail.subtotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      Insurance Pays
                    </dt>
                    <dd className="text-slate-700 font-medium">
                      {money(detail.insurance_pay)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      Your Share
                    </dt>
                    <dd className="text-slate-700 font-medium">
                      {money(detail.patient_pay)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      Outstanding
                    </dt>
                    <dd className="text-slate-900 font-semibold">
                      {money(outstanding(detail))}
                    </dd>
                  </div>
                </dl>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Payment History
                  </p>
                  {detail.payments.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No payments recorded.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {detail.payments.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2"
                        >
                          <span className="flex items-center gap-2 text-slate-600">
                            <CheckCircle2
                              size={14}
                              className="text-emerald-500"
                            />
                            {p.gateway_txn_id}
                          </span>
                          <span className="font-medium text-slate-800">
                            {money(p.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {detail.status !== "PAID" && (
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={paying}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
                  >
                    {paying ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CreditCard size={16} />
                    )}
                    {paying
                      ? "Processing…"
                      : `Pay ${money(outstanding(detail))}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
