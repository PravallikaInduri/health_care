import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Users,
  Search,
  Calendar,
  Stethoscope,
  RefreshCw,
  User,
  Building2,
  BadgeCheck,
} from "lucide-react";
import {
  getHospitalPatients,
  type HospitalPatient,
} from "../../api/hospital.api";

const initials = (first: string, last: string) =>
  `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "P";

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ageFromDob = (dob: string | null) => {
  if (!dob) return "—";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Number.isFinite(age) && age >= 0 ? String(age) : "—";
};

const avatarColor = (s: string) => {
  const colors = [
    "#0EA5E9",
    "#8B5CF6",
    "#F97316",
    "#22C55E",
    "#F43F5E",
    "#14B8A6",
  ];
  return colors[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
};

const statusClass = (status: string | null) => {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";
    case "BOOKED":
    case "CONFIRMED":
      return "bg-sky-50 text-sky-700";
    case "CANCELLED":
    case "NO_SHOW":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const Patients = () => {
  const [patients, setPatients] = useState<HospitalPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchPatients = async (q?: string) => {
    setLoading(true);
    try {
      const res = await getHospitalPatients(q || undefined);
      setPatients(res.data.data.patients);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(debouncedSearch || undefined);
  }, [debouncedSearch]);

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Patient Directory</h1>
            <p className="text-blue-100 text-sm">
              Real patients connected through hospital appointments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-medium">
            {patients.length} patient{patients.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => fetchPatients(debouncedSearch || undefined)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/20 transition text-white"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search by patient name or MRN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Users size={44} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-500">No patients found</p>
            <p className="text-sm mt-1">
              {search
                ? "Try a different search term."
                : "No patient appointments are linked to this hospital yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid grid-cols-[2.2fr_1fr_.8fr_.8fr_1.7fr_1.4fr_1.2fr_1fr] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100">
              {[
                "Patient",
                "MRN",
                "Age",
                "Gender",
                "Assigned Doctor",
                "Department",
                "Last Visit",
                "Status",
              ].map((h) => (
                <span
                  key={h}
                  className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  {h}
                </span>
              ))}
            </div>

            <div className="divide-y divide-slate-50">
              {patients.map((p) => {
                const name = `${p.first_name} ${p.last_name}`.trim();
                return (
                  <div
                    key={p.id}
                    className="grid lg:grid-cols-[2.2fr_1fr_.8fr_.8fr_1.7fr_1.4fr_1.2fr_1fr] gap-4 items-center px-5 py-4 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {p.photo_url ? (
                        <img
                          src={p.photo_url}
                          alt={name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ background: avatarColor(p.id) }}
                        >
                          {initials(p.first_name, p.last_name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {name}
                        </p>
                        <p className="text-xs text-slate-400 lg:hidden">
                          MRN: {p.mrn} · {p.sex || "Gender not added"} ·{" "}
                          {ageFromDob(p.dob)} yrs
                        </p>
                      </div>
                    </div>

                    <span className="hidden lg:block text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-lg w-fit">
                      {p.mrn}
                    </span>
                    <span className="hidden lg:block text-sm text-slate-600">
                      {ageFromDob(p.dob)}
                    </span>
                    <span className="hidden lg:block text-sm text-slate-600">
                      {p.sex || "—"}
                    </span>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <Stethoscope size={13} className="text-sky-500 flex-shrink-0" />
                      <span className="text-sm text-slate-600 truncate">
                        {p.assigned_doctor ? `Dr. ${p.assigned_doctor}` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 size={13} className="text-violet-500 flex-shrink-0" />
                      <span className="text-sm text-slate-600 truncate">
                        {p.department || "—"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                      {fmtDate(p.last_visit)}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold w-fit ${statusClass(
                        p.status
                      )}`}
                    >
                      <BadgeCheck size={12} />
                      {p.status || "UNKNOWN"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex items-center gap-1.5">
              <User size={12} />
              Showing {patients.length} patient
              {patients.length !== 1 ? "s" : ""} from live hospital records
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Patients;
