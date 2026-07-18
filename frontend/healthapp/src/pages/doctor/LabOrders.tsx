import { useEffect, useMemo, useState } from "react";
import {
  Beaker,
  Search as SearchIcon,
  Plus,
  Trash2,
  X,
  ClipboardList,
  CheckCircle2,
  FileText,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  listMyLabOrders,
  getMyLabOrderDetail,
  submitLabResults,
  openProviderLabResult,
  type ProviderLabOrder,
  type ProviderLabOrderDetail,
  type LabResultEntry,
} from "../../api/doctor.api";

const formatSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "ORDERED", label: "Ordered" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_STYLES: Record<string, string> = {
  ORDERED: "bg-amber-50 text-amber-700 ring-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const FLAG_STYLES: Record<string, string> = {
  NORMAL: "bg-emerald-50 text-emerald-700",
  LOW: "bg-amber-50 text-amber-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-rose-50 text-rose-700",
};

const blankResult = (): LabResultEntry => ({
  test: "",
  value: "",
  unit: "",
  reference_range: "",
  flag: "",
  observed_at: new Date().toISOString().slice(0, 16),
});

const DoctorLabOrders = () => {
  const [orders, setOrders] = useState<ProviderLabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [activeOrder, setActiveOrder] =
    useState<ProviderLabOrderDetail | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [entries, setEntries] = useState<LabResultEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listMyLabOrders({
        search: search.trim() || undefined,
        status: status || undefined,
        page,
        limit: 10,
      });
      setOrders(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotal(res.data.pagination.total);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to load lab orders"
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

  const openOrder = async (orderId: string) => {
    setActiveLoading(true);
    setActiveOrder(null);
    setEntries([blankResult()]);
    try {
      const res = await getMyLabOrderDetail(orderId);
      setActiveOrder(res.data.data);
      if (res.data.data.results.length > 0) {
        setEntries([]);
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to load lab order"
      );
    } finally {
      setActiveLoading(false);
    }
  };

  const closeModal = () => {
    setActiveOrder(null);
    setEntries([]);
  };

  const viewUpload = async (resultId: string) => {
    try {
      await openProviderLabResult(resultId);
    } catch {
      toast.error("Failed to open result file");
    }
  };

  const setEntryAt = (
    idx: number,
    patch: Partial<LabResultEntry>
  ) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, ...patch } : e))
    );
  };

  const addEntry = () =>
    setEntries((prev) => [...prev, blankResult()]);

  const removeEntry = (idx: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!activeOrder) return;
    if (entries.length === 0) {
      toast.error("Add at least one result");
      return;
    }
    for (const e of entries) {
      if (!e.test.trim() || !e.value.trim()) {
        toast.error("Each result needs a test and value");
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload: LabResultEntry[] = entries.map((e) => ({
        test: e.test.trim(),
        value: e.value.trim(),
        unit: e.unit?.trim() || undefined,
        reference_range:
          e.reference_range?.trim() || undefined,
        flag: e.flag || undefined,
        observed_at: e.observed_at
          ? new Date(e.observed_at).toISOString()
          : undefined,
      }));
      await submitLabResults(activeOrder.id, payload);
      toast.success("Results saved · order marked Completed");
      closeModal();
      void load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to save results"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const completed = orders.filter(
      (o) => o.status === "COMPLETED"
    ).length;
    const pending = orders.filter(
      (o) => o.status === "ORDERED" || o.status === "IN_PROGRESS"
    ).length;
    return { completed, pending };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Beaker className="text-blue-600" />
            Lab Orders
          </h1>
          <p className="text-slate-500 mt-1">
            Review your patients' lab orders and record results.
          </p>
        </div>
        <div className="flex gap-3">
          <span className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium ring-1 ring-amber-200">
            {summary.pending} awaiting results (this page)
          </span>
          <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium ring-1 ring-emerald-200">
            {summary.completed} completed (this page)
          </span>
        </div>
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
              placeholder="Search by patient name, MRN or order ID…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
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
                  Order ID
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ordered
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Results
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    Loading lab orders…
                  </td>
                </tr>
              )}

              {!loading && orders.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    No lab orders match your filters.
                  </td>
                </tr>
              )}

              {!loading &&
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {o.id.slice(0, 8)}…
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">
                        {o.first_name} {o.last_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        MRN {o.mrn || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                          STATUS_STYLES[o.status] ||
                          "bg-slate-50 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {new Date(o.ordered_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {o.result_count} recorded
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openOrder(o.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                      >
                        <ClipboardList size={14} />
                        {o.status === "COMPLETED"
                          ? "View Results"
                          : "Enter Results"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>
            {total} order{total === 1 ? "" : "s"}
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

      {(activeOrder || activeLoading) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Lab Result Entry
                </h3>
                {activeOrder && (
                  <p className="text-xs text-slate-500">
                    {activeOrder.first_name}{" "}
                    {activeOrder.last_name} · MRN{" "}
                    {activeOrder.mrn || "—"} · ordered{" "}
                    {new Date(
                      activeOrder.ordered_at
                    ).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {activeLoading && (
                <p className="text-sm text-slate-400 text-center py-12">
                  Loading order…
                </p>
              )}

              {activeOrder &&
                activeOrder.uploads &&
                activeOrder.uploads.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <FileText size={16} className="text-cyan-600" />
                      Result files from the lab (
                      {activeOrder.uploads.length})
                    </h4>
                    <ul className="space-y-2">
                      {activeOrder.uploads.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {u.test_name ? `${u.test_name} — ` : ""}
                              {u.file_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatSize(u.size_bytes)} ·{" "}
                              {u.uploaded_at
                                ? new Date(
                                    u.uploaded_at
                                  ).toLocaleString()
                                : "—"}
                              {u.note ? ` · ${u.note}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => viewUpload(u.id)}
                            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 text-xs font-medium"
                          >
                            <Download size={13} /> Open
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {activeOrder &&
                activeOrder.results.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <CheckCircle2
                        size={16}
                        className="text-emerald-600"
                      />
                      Recorded results ({activeOrder.results.length})
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 font-medium text-slate-600">
                              Test
                            </th>
                            <th className="px-3 py-2 font-medium text-slate-600">
                              Value
                            </th>
                            <th className="px-3 py-2 font-medium text-slate-600">
                              Unit
                            </th>
                            <th className="px-3 py-2 font-medium text-slate-600">
                              Reference
                            </th>
                            <th className="px-3 py-2 font-medium text-slate-600">
                              Flag
                            </th>
                            <th className="px-3 py-2 font-medium text-slate-600">
                              Observed
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeOrder.results.map((r) => (
                            <tr key={r.id}>
                              <td className="px-3 py-2 text-slate-700">
                                {r.test}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {r.value}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {r.unit || "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {r.reference_range || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {r.flag ? (
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${FLAG_STYLES[r.flag]}`}
                                  >
                                    {r.flag}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600 text-xs">
                                {new Date(
                                  r.observed_at
                                ).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {activeOrder && entries.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700">
                      {activeOrder.results.length > 0
                        ? "Add more results"
                        : "Enter results"}
                    </h4>
                    <button
                      type="button"
                      onClick={addEntry}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium"
                    >
                      <Plus size={14} /> Add row
                    </button>
                  </div>

                  <div className="space-y-3">
                    {entries.map((entry, idx) => (
                      <div
                        key={idx}
                        className="grid sm:grid-cols-6 gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/40"
                      >
                        <input
                          placeholder="Test"
                          value={entry.test}
                          onChange={(e) =>
                            setEntryAt(idx, {
                              test: e.target.value,
                            })
                          }
                          className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                        />
                        <input
                          placeholder="Value"
                          value={entry.value}
                          onChange={(e) =>
                            setEntryAt(idx, {
                              value: e.target.value,
                            })
                          }
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                        />
                        <input
                          placeholder="Unit"
                          value={entry.unit || ""}
                          onChange={(e) =>
                            setEntryAt(idx, {
                              unit: e.target.value,
                            })
                          }
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                        />
                        <input
                          placeholder="Reference range"
                          value={entry.reference_range || ""}
                          onChange={(e) =>
                            setEntryAt(idx, {
                              reference_range:
                                e.target.value,
                            })
                          }
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                        />
                        <select
                          value={entry.flag || ""}
                          onChange={(e) =>
                            setEntryAt(idx, {
                              flag: e.target
                                .value as LabResultEntry["flag"],
                            })
                          }
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                        >
                          <option value="">No flag</option>
                          <option value="NORMAL">Normal</option>
                          <option value="LOW">Low</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">
                            Critical
                          </option>
                        </select>
                        <div className="sm:col-span-5">
                          <input
                            type="datetime-local"
                            value={entry.observed_at || ""}
                            onChange={(e) =>
                              setEntryAt(idx, {
                                observed_at: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          {entries.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEntry(idx)}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                              aria-label="Remove row"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeOrder &&
                entries.length === 0 &&
                activeOrder.results.length > 0 && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={addEntry}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                    >
                      <Plus size={14} /> Add another result
                    </button>
                  </div>
                )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
              >
                Close
              </button>
              {activeOrder && entries.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
                >
                  {submitting
                    ? "Saving…"
                    : "Save results · Mark Completed"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLabOrders;
