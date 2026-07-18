import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  Download,
  ClipboardList,
  Upload,
  Loader2,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";
import {
  getLabOrders,
  updateLabOrderStatus,
  downloadLabResult,
  markLabOrderPaid,
  type LabOrder,
  type LabOrderStatus,
} from "../../api/lab.api";
import { uploadLabReport } from "../../api/labReports.api";

const money = (n: number | string | null | undefined) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const STATUSES: LabOrderStatus[] = [
  "ORDERED",
  "RECEIVED",
  "IN_PROGRESS",
  "COMPLETED",
];

const FILTERS = ["ALL", ...STATUSES] as const;

const statusColor = (s: LabOrderStatus) => {
  switch (s) {
    case "ORDERED":
      return "bg-slate-100 text-slate-600";
    case "RECEIVED":
      return "bg-sky-100 text-sky-700";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";
  }
};

const ResultUploader = ({
  order,
  onUploaded,
}: {
  order: LabOrder;
  onUploaded: () => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [testName, setTestName] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please choose a result file");
      return;
    }
    try {
      setUploading(true);
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Please upload a PDF report");
        return;
      }
      await uploadLabReport(file, {
        lab_order_id: order.id,
        report_name: testName || file.name,
        remarks: note || undefined,
        status: "UPLOADED",
      });
      toast.success("Report uploaded and patient notification sent");
      setFile(null);
      setTestName("");
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to upload result"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 space-y-3"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Upload PDF report
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <select
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
        >
          <option value="">For which test? (optional)</option>
          {order.tests.map((t) => (
            <option key={t.id} value={t.test_name}>
              {t.test_name}
            </option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
        />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note for the patient / doctor (optional)"
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Max 10 MB. PDF reports only.</p>
        <button
          type="submit"
          disabled={uploading}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 text-sm font-medium disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? "Uploading…" : "Upload Result"}
        </button>
      </div>
    </form>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]>("ALL");

  const load = async () => {
    try {
      const res = await getLabOrders(filter === "ALL" ? undefined : filter);
      setOrders(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const changeStatus = async (id: string, status: LabOrderStatus) => {
    try {
      await updateLabOrderStatus(id, status);
      toast.success("Status updated");
      setLoading(true);
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to update status"
      );
    }
  };

  const markPaid = async (id: string) => {
    try {
      await markLabOrderPaid(id);
      toast.success("Payment recorded — added to earnings");
      setLoading(true);
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to record payment"
      );
    }
  };

  const viewResult = async (id: string) => {
    try {
      const res = await downloadLabResult(id);
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank");
    } catch {
      toast.error("Failed to open file");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lab Orders</h1>
        <p className="text-slate-500 mt-1">
          Orders routed to your lab. Update status and review uploaded
          results.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f
                ? "bg-cyan-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f === "ALL" ? "All" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="h-10 w-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-10 text-center text-slate-400">
          <ClipboardList className="mx-auto mb-3 text-slate-300" size={36} />
          No lab orders here yet. They appear once doctors route orders to
          your lab.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {o.first_name || o.last_name
                      ? `${o.first_name ?? ""} ${o.last_name ?? ""}`.trim()
                      : "Patient"}
                    {o.mrn && (
                      <span className="text-slate-400 font-normal text-sm">
                        {" "}
                        · {o.mrn}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Ordered{" "}
                    {new Date(o.ordered_at).toLocaleDateString()} ·{" "}
                    {o.provider_name
                      ? `Dr. ${o.provider_name}`
                      : "Unknown provider"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(
                      o.status
                    )}`}
                  >
                    {o.status.replace("_", " ")}
                  </span>
                  <select
                    value={o.status}
                    onChange={(e) =>
                      changeStatus(o.id, e.target.value as LabOrderStatus)
                    }
                    className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-cyan-400"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {o.tests.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase">
                    Tests
                  </p>
                  <ul className="mt-2 space-y-1">
                    {o.tests.map((t) => (
                      <li
                        key={t.id}
                        className="text-sm text-slate-600 flex items-center justify-between gap-2"
                      >
                        <span className="flex gap-2 min-w-0">
                          <span className="font-medium">{t.test_name}</span>
                          {t.instructions && (
                            <span className="text-slate-400 truncate">
                              — {t.instructions}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-medium text-slate-700">
                          {t.price != null ? (
                            money(t.price)
                          ) : (
                            <span className="text-amber-500 text-xs font-normal">
                              not priced
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    Total
                  </span>
                  <span className="text-lg font-bold text-slate-800">
                    {money(o.total)}
                  </span>
                  {o.payment_status === "PAID" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={13} /> Paid
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                      Unpaid
                    </span>
                  )}
                </div>
                {o.payment_status !== "PAID" && (
                  <button
                    onClick={() => markPaid(o.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
                  >
                    <IndianRupee size={15} /> Mark as Paid
                  </button>
                )}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-400 uppercase">
                  Results
                </p>
                {o.uploads.length === 0 ? (
                  <p className="text-sm text-slate-400 mt-2">
                    No results uploaded yet.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {o.uploads.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText
                            size={16}
                            className="text-cyan-600 shrink-0"
                          />
                          <span className="text-sm text-slate-700 truncate">
                            {u.file_name || u.test_name || "Result"}
                          </span>
                        </div>
                        <button
                          onClick={() => viewResult(u.id)}
                          className="inline-flex items-center gap-1.5 text-sm text-cyan-700 font-medium hover:underline shrink-0"
                        >
                          <Download size={15} /> View
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <ResultUploader
                  order={o}
                  onUploaded={() => {
                    setLoading(true);
                    load();
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
