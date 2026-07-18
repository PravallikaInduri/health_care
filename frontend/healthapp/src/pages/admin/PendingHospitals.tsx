import { useEffect, useState } from "react";
import { FlaskConical, Pill, FileText, MapPin } from "lucide-react";
import api from "../../api/axios";
import {
  getPendingHospitals,
  approveHospital,
  rejectHospital,
} from "../../api/admin.api";

interface PendingHospital {
  id: string;
  name: string;
  email: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  has_lab: number;
  has_pharmacy: number;
}

const PendingHospitals = () => {
  const [hospitals, setHospitals] = useState<PendingHospital[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await getPendingHospitals();
      setHospitals(res.data.data);
    } catch {
      alert("Failed to load pending hospitals");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setBusyId(id);
      await approveHospital(id);
      alert("Hospital Approved");
      load();
    } catch {
      alert("Failed to approve hospital");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason");
    if (!reason) return;
    try {
      setBusyId(id);
      await rejectHospital(id, reason);
      alert("Hospital Rejected");
      load();
    } catch {
      alert("Failed to reject hospital");
    } finally {
      setBusyId(null);
    }
  };

  const viewDocument = async (id: string) => {
    try {
      const res = await api.get(`/admin/hospitals/${id}/document`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank");
    } catch {
      alert("Could not open document");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pending Hospitals</h1>
        <p className="text-slate-500 mt-1">
          Review hospital registrations and their proof documents before
          approving access.
        </p>
      </div>

      {hospitals.length === 0 ? (
        <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-400">
          No hospital registrations awaiting review.
        </div>
      ) : (
        <div className="space-y-4">
          {hospitals.map((h) => (
            <div
              key={h.id}
              className="bg-white shadow rounded-2xl p-6 flex flex-wrap justify-between items-start gap-4"
            >
              <div className="space-y-2">
                <h2 className="font-bold text-xl text-indigo-600">
                  {h.name}
                </h2>
                <p className="text-slate-600">{h.email}</p>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <MapPin size={15} />
                  {[h.address, h.city].filter(Boolean).join(", ") ||
                    "No address provided"}
                  {h.phone ? ` · ${h.phone}` : ""}
                </div>

                <div className="flex gap-2 pt-1">
                  {h.has_lab ? (
                    <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700">
                      <FlaskConical size={13} /> Has Lab
                    </span>
                  ) : null}
                  {h.has_pharmacy ? (
                    <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      <Pill size={13} /> Has Pharmacy
                    </span>
                  ) : null}
                </div>

                <button
                  onClick={() => viewDocument(h.id)}
                  className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <FileText size={15} />
                  View proof document
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  disabled={busyId === h.id}
                  onClick={() => handleApprove(h.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  disabled={busyId === h.id}
                  onClick={() => handleReject(h.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingHospitals;
