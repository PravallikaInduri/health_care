import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Printer, Search, X, ZoomIn, ZoomOut } from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchLabReportPdf,
  getMyLabReports,
  type LabReport,
  type LabReportStatus,
} from "../../api/labReports.api";

const STATUSES: Array<"" | LabReportStatus> = [
  "",
  "PENDING",
  "SAMPLE_COLLECTED",
  "PROCESSING",
  "COMPLETED",
  "UPLOADED",
];

const statusClass = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    SAMPLE_COLLECTED: "bg-sky-50 text-sky-700 ring-sky-200",
    PROCESSING: "bg-blue-50 text-blue-700 ring-blue-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    UPLOADED: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return map[status] || "bg-slate-50 text-slate-700 ring-slate-200";
};

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "-";

const fullName = (report: LabReport) =>
  [report.first_name, report.last_name].filter(Boolean).join(" ") || "Patient";

const LabReports = () => {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viewer, setViewer] = useState<{ report: LabReport; url: string } | null>(null);
  const [zoom, setZoom] = useState(1);

  const params = useMemo(
    () => ({ search: search || undefined, status: status || undefined, from: from || undefined, to: to || undefined }),
    [search, status, from, to]
  );

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await getMyLabReports(params);
      setReports(res.data.data || []);
    } catch {
      toast.error("Failed to load lab reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [params]);

  const openPdf = async (report: LabReport) => {
    try {
      const res = await fetchLabReportPdf(report.id);
      const url = URL.createObjectURL(res.data as Blob);
      setViewer((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return { report, url };
      });
      setZoom(1);
    } catch {
      toast.error("Failed to open report");
    }
  };

  const closeViewer = () => {
    if (viewer) URL.revokeObjectURL(viewer.url);
    setViewer(null);
  };

  const downloadPdf = async (report: LabReport) => {
    try {
      const res = await fetchLabReportPdf(report.id);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.report_name || "lab-report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download report");
    }
  };

  const printPdf = () => {
    if (!viewer) return;
    const frame = document.getElementById("lab-report-frame") as HTMLIFrameElement | null;
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Medical Records</p>
        <h1 className="text-2xl font-bold text-slate-800">Lab Reports</h1>
        <p className="text-sm text-slate-500">View, search, print and download your uploaded PDF reports.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 grid md:grid-cols-12 gap-3">
        <div className="md:col-span-4 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search report, test, hospital"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="md:col-span-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
        >
          {STATUSES.map((item) => (
            <option key={item || "ALL"} value={item}>{item ? item.replace("_", " ") : "All statuses"}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="md:col-span-2 px-3 py-2.5 rounded-xl border border-slate-200" />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="md:col-span-2 px-3 py-2.5 rounded-xl border border-slate-200" />
        <button
          type="button"
          onClick={() => { setSearch(""); setStatus(""); setFrom(""); setTo(""); }}
          className="md:col-span-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200"
        >
          Clear
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Report Name",
                  "Test Name",
                  "Hospital Name",
                  "Uploaded By",
                  "Upload Date",
                  "Status",
                  "View",
                  "Download",
                ].map((head) => (
                  <th key={head} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Loading reports...</td></tr>
              )}
              {!loading && reports.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No uploaded lab reports found.</td></tr>
              )}
              {!loading && reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <span className="inline-flex items-center gap-2"><FileText size={15} className="text-sky-600" />{report.report_name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{report.test_name || report.report_name}</td>
                  <td className="px-4 py-3 text-slate-600">{report.hospital_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{report.uploaded_by_email || "Lab Technician"}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(report.uploaded_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${statusClass(report.status)}`}>
                      {report.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openPdf(report)} className="inline-flex items-center gap-1 text-sky-700 font-medium hover:underline"><Eye size={14} /> View</button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => downloadPdf(report)} className="inline-flex items-center gap-1 text-slate-700 font-medium hover:underline"><Download size={14} /> Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewer && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{viewer.report.report_name}</p>
                <p className="text-xs text-slate-500">{fullName(viewer.report)} ? {fmtDate(viewer.report.uploaded_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom((value) => Math.max(0.75, value - 0.1))} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"><ZoomOut size={16} /></button>
                <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"><ZoomIn size={16} /></button>
                <button onClick={() => downloadPdf(viewer.report)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"><Download size={16} /></button>
                <button onClick={printPdf} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"><Printer size={16} /></button>
                <button onClick={closeViewer} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><X size={16} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-4">
              <iframe
                id="lab-report-frame"
                title="Lab report PDF viewer"
                src={viewer.url}
                className="mx-auto bg-white shadow w-full h-full origin-top"
                style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%`, height: `${100 / zoom}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabReports;
