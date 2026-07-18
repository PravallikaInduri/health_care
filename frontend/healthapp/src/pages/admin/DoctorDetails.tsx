import { useEffect, useState } from "react";

import {
  useParams,
  useNavigate,
} from "react-router-dom";

import { Building2, Download, Eye, FileText, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import {
  getDoctorById,
  approveDoctor,
  rejectDoctor,
  getDoctorDocument,
  listProviderFacilitiesAdmin,
  removeFacilityFromProvider,
  type AdminFacility,
} from "../../api/admin.api";
import AssignFacilityModal from "../../components/admin/AssignFacilityModal";
import ProviderDepartmentsPanel from "../../components/admin/ProviderDepartmentsPanel";

const TYPE_STYLES: Record<string, string> = {
  HOSPITAL: "bg-blue-50 text-blue-700 ring-blue-200",
  CLINIC: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LAB: "bg-violet-50 text-violet-700 ring-violet-200",
};

const DoctorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [assigned, setAssigned] = useState<AdminFacility[]>(
    []
  );
  const [assignedLoading, setAssignedLoading] =
    useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [documentViewer, setDocumentViewer] = useState<{
    url: string;
    mime: string;
    fileName: string;
  } | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const documentErrorMessage = (status?: number) => {
    if (status === 404) return "Document not found.";
    if (status === 401 || status === 403) return "Access denied.";
    return "Unable to load document.";
  };

  const parseFileName = (contentDisposition?: string) => {
    const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
    return match?.[1] || "doctor-verification-document";
  };

  const closeDocumentViewer = () => {
    if (documentViewer) URL.revokeObjectURL(documentViewer.url);
    setDocumentViewer(null);
  };

  const loadDoctor = async () => {
    try {
      const response = await getDoctorById(id!);
      setDoctor(response.data.data);
    } catch {
      toast.error("Failed to load doctor details");
    } finally {
      setLoading(false);
    }
  };

  const loadAssigned = async () => {
    if (!id) return;
    try {
      setAssignedLoading(true);
      const res = await listProviderFacilitiesAdmin(id);
      setAssigned(res.data.data || []);
    } catch {
      toast.error("Failed to load assigned facilities");
    } finally {
      setAssignedLoading(false);
    }
  };

  useEffect(() => {
    loadDoctor();
    loadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleApprove = async () => {
    try {
      await approveDoctor(id!);
      alert("Doctor Approved");
      navigate("/admin/pending-doctors");
    } catch {
      toast.error("Failed to approve doctor");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Enter rejection reason");
    if (!reason) return;
    try {
      await rejectDoctor(id!, reason);
      alert("Doctor Rejected");
      navigate("/admin/pending-doctors");
    } catch {
      toast.error("Failed to reject doctor");
    }
  };

  const handleRemoveFacility = async (
    facility: AdminFacility
  ) => {
    if (!id) return;
    const ok = window.confirm(
      `Remove "${facility.name}" from this doctor?`
    );
    if (!ok) return;
    try {
      await removeFacilityFromProvider(id, facility.id);
      toast.success("Facility removed");
      loadAssigned();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to remove facility"
      );
    }
  };

  const handleViewDocument = async () => {
    if (!doctor?.id) return;
    try {
      setDocumentLoading(true);
      setDocumentError(null);
      const response = await getDoctorDocument(doctor.id);
      const mime = String(response.headers["content-type"] || "");
      if (!mime.includes("application/pdf") && !mime.startsWith("image/")) {
        setDocumentError("Unable to load document.");
        return;
      }
      const url = URL.createObjectURL(response.data as Blob);
      if (documentViewer) URL.revokeObjectURL(documentViewer.url);
      setDocumentViewer({
        url,
        mime,
        fileName: parseFileName(response.headers["content-disposition"]),
      });
    } catch (error: any) {
      setDocumentError(documentErrorMessage(error?.response?.status));
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!doctor?.id) return;
    try {
      setDocumentLoading(true);
      setDocumentError(null);
      const response = await getDoctorDocument(doctor.id);
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = parseFileName(response.headers["content-disposition"]);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setDocumentError(documentErrorMessage(error?.response?.status));
    } finally {
      setDocumentLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!doctor) {
    return <div>Doctor not found</div>;
  }

  const isPending =
    String(doctor.verification_status ?? "").toUpperCase() ===
    "PENDING";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <div className="space-y-4">
          <p>
            <strong>Name:</strong> {doctor.name}
          </p>
          <p>
            <strong>Email:</strong> {doctor.email}
          </p>
          <p>
            <strong>Specialty:</strong> {doctor.specialty}
          </p>
          <p>
            <strong>Languages:</strong> {doctor.languages}
          </p>
          <p>
            <strong>MCI/NPI:</strong> {doctor.npi_or_mci}
          </p>
          <p>
            <strong>Bio:</strong> {doctor.bio}
          </p>
        </div>

        <div className="mt-8">
          <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleViewDocument}
            disabled={documentLoading}
            className="
            bg-blue-600
            text-white
            px-5
            py-3
            rounded-xl
            inline-flex
            items-center
            gap-2
            disabled:opacity-60
          "
          >
            <Eye size={16} />
            {documentLoading ? "Loading..." : "View Document"}
          </button>
          <button
            type="button"
            onClick={handleDownloadDocument}
            disabled={documentLoading}
            className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-5 py-3 rounded-xl hover:bg-slate-200 disabled:opacity-60"
          >
            <Download size={16} /> Download
          </button>
          </div>
          {documentError && (
            <p className="mt-3 text-sm text-rose-600">
              {documentError}
            </p>
          )}
        </div>

        {isPending && (
          <div className="flex gap-4 mt-10">
            <button
              onClick={handleApprove}
              className="
              bg-green-600
              text-white
              px-6
              py-3
              rounded-xl
            "
            >
              Approve
            </button>

            <button
              onClick={handleReject}
              className="
              bg-red-600
              text-white
              px-6
              py-3
              rounded-xl
            "
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Departments */}
      {id && <ProviderDepartmentsPanel providerId={id} />}

      {/* Assigned Facilities */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Assigned Facilities
            </h3>
            <p className="text-sm text-slate-400">
              Patients see these facilities when booking with
              this doctor.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={16} /> Assign Facility
          </button>
        </div>

        <div className="px-6 py-5">
          {assignedLoading ? (
            <p className="text-slate-400 text-sm">
              Loading facilities…
            </p>
          ) : assigned.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No facilities assigned yet.
            </p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-3">
              {assigned.map((f) => (
                <li
                  key={f.id}
                  className="flex items-start justify-between gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/40"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {f.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {f.address || "—"}
                      </p>
                      <span
                        className={`inline-flex mt-2 items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ring-1 ${
                          TYPE_STYLES[f.type] ||
                          "bg-slate-50 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {f.type.charAt(0) +
                          f.type.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFacility(f)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-medium shrink-0"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {id && (
        <AssignFacilityModal
          open={assignOpen}
          providerId={id}
          assignedIds={assigned.map((f) => f.id)}
          onClose={() => setAssignOpen(false)}
          onAssigned={loadAssigned}
        />
      )}

      {documentViewer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 inline-flex items-center gap-2 truncate">
                  <FileText size={16} className="text-blue-600" />
                  {documentViewer.fileName}
                </p>
                <p className="text-xs text-slate-400">
                  {documentViewer.mime}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadDocument}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm"
                >
                  <Download size={14} /> Download
                </button>
                <button
                  type="button"
                  onClick={closeDocumentViewer}
                  className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                  aria-label="Close document viewer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 overflow-auto p-4">
              {documentViewer.mime.includes("application/pdf") ? (
                <iframe
                  title="Doctor verification document"
                  src={documentViewer.url}
                  className="w-full h-full bg-white rounded-xl shadow"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <img
                    src={documentViewer.url}
                    alt="Doctor verification document"
                    className="max-h-full max-w-full rounded-xl shadow bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDetails;
