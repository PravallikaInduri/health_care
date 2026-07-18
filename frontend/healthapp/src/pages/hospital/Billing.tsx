import { useEffect, useState } from "react";
import {
  Stethoscope,
  FlaskConical,
  Pill,
  Wallet,
} from "lucide-react";
import {
  getHospitalBilling,
  type HospitalBilling,
} from "../../api/hospital.api";

const money = (value: string | number | null) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

const Billing = () => {
  const [data, setData] = useState<HospitalBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getHospitalBilling();
        setData(res.data.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load billing");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 rounded-2xl p-6">{error}</div>
    );
  }

  const earnings = data?.earnings ?? {
    consultations: 0,
    labs: 0,
    pharmacy: 0,
    total: 0,
  };

  const cards = [
    {
      label: "Total Earnings",
      value: money(earnings.total),
      icon: Wallet,
      color: "text-indigo-600 bg-indigo-100",
    },
    {
      label: "Consultations",
      value: money(earnings.consultations),
      icon: Stethoscope,
      color: "text-sky-600 bg-sky-100",
    },
    {
      label: "Lab Earnings",
      value: money(earnings.labs),
      icon: FlaskConical,
      color: "text-cyan-600 bg-cyan-100",
    },
    {
      label: "Pharmacy Earnings",
      value: money(earnings.pharmacy),
      icon: Pill,
      color: "text-emerald-600 bg-emerald-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing &amp; Earnings</h1>
        <p className="text-slate-500 mt-1">
          Total revenue collected at {data?.hospital.name}, split by
          consultations, labs and pharmacy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl shadow-sm p-6">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.color}`}
              >
                <Icon size={22} />
              </div>
              <p className="mt-4 text-2xl font-bold">{c.value}</p>
              <p className="text-slate-500">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Stethoscope size={18} className="text-sky-600" />
          <h2 className="font-semibold">Consultation Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Doctor</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data && data.payments.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No payments yet.
                  </td>
                </tr>
              )}
              {data?.payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">
                      {p.patient_name || "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                      MRN {p.mrn || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {p.provider_name || "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatDate(p.scheduled_at)}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {money(p.consultation_fee)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        p.payment_status === "PAID"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {p.payment_status === "PAID" ? "PAID" : "PENDING"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {p.gateway_txn_id || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FlaskConical size={18} className="text-cyan-600" />
          <h2 className="font-semibold">Lab Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Lab</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data && data.labPayments.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    No lab payments yet.
                  </td>
                </tr>
              )}
              {data?.labPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">
                      {p.patient_name || "—"}
                    </p>
                    <p className="text-xs text-slate-400">MRN {p.mrn || "—"}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {p.lab_name || "—"}
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

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Pill size={18} className="text-emerald-600" />
          <h2 className="font-semibold">Pharmacy Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Medicine</th>
                <th className="px-6 py-3 font-medium">Pharmacy</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data && data.pharmacyPayments.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    No pharmacy payments yet.
                  </td>
                </tr>
              )}
              {data?.pharmacyPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">
                      {p.patient_name || "—"}
                    </p>
                    <p className="text-xs text-slate-400">MRN {p.mrn || "—"}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
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
  );
};

export default Billing;
