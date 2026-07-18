import { useEffect, useState } from "react";
import {
  Link,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  Pill,
  Search as SearchIcon,
  Eye,
  CheckCircle2,
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  listPharmacyPrescriptions,
  dispensePrescription,
  markPrescriptionPaid,
  type Prescription,
  type RxStatus,
} from "../../api/pharmacy.api";

const money = (n: number | string | null | undefined) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const STATUS_FILTERS: { value: "" | RxStatus; label: string }[] = [
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

const PharmacyPrescriptions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialStatus =
    (searchParams.get("status") as RxStatus | "") || "";

  const [search, setSearch] = useState(
    searchParams.get("search") || ""
  );
  const [status, setStatus] = useState<RxStatus | "">(
    initialStatus
  );
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [dispensingId, setDispensingId] = useState<string | null>(
    null
  );
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listPharmacyPrescriptions({
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

  /* keep URL in sync so dashboard tiles deep-link cleanly */
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

  const handleDispense = async (rx: Prescription) => {
    if (rx.status !== "ACTIVE") {
      toast.error(`Cannot dispense — already ${rx.status}`);
      return;
    }
    if (
      !window.confirm(
        `Dispense ${rx.medication_name || "this medication"} for ${rx.first_name || ""} ${rx.last_name || ""}?`
      )
    ) {
      return;
    }
    setDispensingId(rx.id);
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
      setDispensingId(null);
    }
  };

  const handlePaid = async (rx: Prescription) => {
    setPayingId(rx.id);
    try {
      await markPrescriptionPaid(rx.id);
      toast.success("Payment recorded");
      void load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to record payment"
      );
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Pill className="text-blue-600" />
        <h1 className="text-3xl font-bold">Prescriptions</h1>
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
              placeholder="Search by patient, MRN or medication…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as RxStatus | "");
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
                  Duration
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Refills
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Prescribed
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Price
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
                    colSpan={10}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    Loading prescriptions…
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    {search.trim() || status
                      ? "No prescriptions match your filters."
                      : "No prescriptions routed to your pharmacy yet."}
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
                    <td className="px-6 py-4 text-slate-600">
                      {rx.duration_days
                        ? `${rx.duration_days} days`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {rx.refills_used} / {rx.refills_allowed}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {new Date(
                        rx.prescribed_at
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {rx.price != null ? (
                        <div>
                          <p className="font-medium text-slate-800">
                            {money(
                              rx.payment_status === "PAID"
                                ? rx.amount
                                : rx.price
                            )}
                          </p>
                          <span
                            className={`text-xs font-medium ${
                              rx.payment_status === "PAID"
                                ? "text-emerald-600"
                                : "text-rose-500"
                            }`}
                          >
                            {rx.payment_status === "PAID" ? "Paid" : "Unpaid"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-500">
                          Not priced
                        </span>
                      )}
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
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() =>
                            navigate(
                              `/pharmacy/prescriptions/${rx.id}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                        >
                          <Eye size={14} /> View
                        </button>
                        {rx.status === "ACTIVE" && (
                          <button
                            disabled={dispensingId === rx.id}
                            onClick={() => handleDispense(rx)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium disabled:opacity-60"
                          >
                            <CheckCircle2 size={14} />
                            {dispensingId === rx.id
                              ? "Dispensing…"
                              : "Dispense"}
                          </button>
                        )}
                        {rx.payment_status !== "PAID" && (
                          <button
                            disabled={payingId === rx.id || rx.price == null}
                            onClick={() => handlePaid(rx)}
                            title={
                              rx.price == null
                                ? "Set a price in your Medicine Catalogue first"
                                : undefined
                            }
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 text-sm font-medium disabled:opacity-60"
                          >
                            <IndianRupee size={14} />
                            {payingId === rx.id ? "Saving…" : "Mark Paid"}
                          </button>
                        )}
                      </div>
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

      {/* Hidden link helps preserve typed search across reloads */}
      <Link
        to="/pharmacy/prescriptions"
        className="hidden"
      ></Link>
    </div>
  );
};

export default PharmacyPrescriptions;
