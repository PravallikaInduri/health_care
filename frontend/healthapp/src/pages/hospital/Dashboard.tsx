import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Stethoscope,
  FlaskConical,
  Pill,
  Users,
  ArrowRight,
  AlertTriangle,
  Building2,
  Layers,
  UserCog,
  Activity,
  FolderOpen,
  FileText,
  Calendar,
  TrendingUp,
} from "lucide-react";
import {
  getHospitalOverview,
  type HospitalOverview,
} from "../../api/hospital.api";

/* ── helpers ── */
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const STATUS_CLS: Record<string, string> = {
  REQUESTED: "bg-amber-50 text-amber-700",
  BOOKED: "bg-sky-50 text-sky-700",
  SCHEDULED: "bg-sky-50 text-sky-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CHECKED_IN: "bg-violet-50 text-violet-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-rose-50 text-rose-600",
  NO_SHOW: "bg-amber-50 text-amber-700",
};

/* ── sub-components ── */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  bg: string;
  iconColor: string;
  sublabel?: string;
  to?: string;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  bg,
  iconColor,
  sublabel,
  to,
}: StatCardProps) => {
  const inner = (
    <div
      className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4 hover:shadow-md transition-all group cursor-pointer"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}
      >
        <Icon size={22} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-slate-800 leading-tight">
          {value}
        </p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">{label}</p>
        {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
      </div>
      {to && (
        <ArrowRight
          size={16}
          className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all mt-1 flex-shrink-0"
        />
      )}
    </div>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
};

/* ── main component ── */
const Dashboard = () => {
  const [data, setData] = useState<HospitalOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getHospitalOverview();
        setData(res.data.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load overview");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-12 w-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 text-rose-700 rounded-2xl p-6">{error}</div>
    );
  }

  const unroutedLabs = data?.unrouted?.labOrders ?? 0;
  const unroutedRx = data?.unrouted?.prescriptions ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Hero Header ── */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg,#0EA5E9 0%,#0284C7 100%)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <Building2 size={28} className="text-white" />
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium">
                Hospital Management
              </p>
              <h1 className="text-2xl font-bold text-white">
                {data?.hospital.name ?? "Hospital"}
              </h1>
              <p className="text-blue-200 text-sm mt-0.5">
                Manage doctors, departments, labs, pharmacies and patients.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/hospital/departments"
              className="inline-flex items-center gap-2 bg-white text-sky-700 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-sky-50 transition"
            >
              <FolderOpen size={16} /> Departments
            </Link>
            <Link
              to="/hospital/units"
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/25 transition"
            >
              <Layers size={16} /> Manage Units
            </Link>
            <Link
              to="/hospital/staff"
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/25 transition"
            >
              <UserCog size={16} /> Staff
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Row 1: patients + departments ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Hospital Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Patients"
            value={data?.counts.patients ?? 0}
            icon={Users}
            bg="#EFF6FF"
            iconColor="#3B82F6"
            sublabel="Patients visited"
            to="/hospital/patients"
          />
          <StatCard
            label="Departments"
            value={data?.counts.departments ?? 0}
            icon={FolderOpen}
            bg="#F0FDF4"
            iconColor="#22C55E"
            sublabel="Active at this hospital"
            to="/hospital/departments"
          />
          <StatCard
            label="Affiliated Doctors"
            value={data?.counts.doctors ?? 0}
            icon={Stethoscope}
            bg="#F0FDFA"
            iconColor="#14B8A6"
            sublabel="Linked providers"
            to="/hospital/doctors"
          />
        </div>
      </div>

      {/* ── Stats Row 2: units + staff ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Labs"
          value={data?.counts.labs ?? 0}
          icon={FlaskConical}
          bg="#F8FAFC"
          iconColor="#0EA5E9"
          sublabel="In-house units"
          to="/hospital/units"
        />
        <StatCard
          label="Pharmacies"
          value={data?.counts.pharmacies ?? 0}
          icon={Pill}
          bg="#FFF7ED"
          iconColor="#F97316"
          sublabel="Routing destinations"
          to="/hospital/units"
        />
        <StatCard
          label="Staff Members"
          value={data?.counts.staff ?? 0}
          icon={UserCog}
          bg="#FDF4FF"
          iconColor="#A855F7"
          sublabel="Active team"
          to="/hospital/staff"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Lab Reports"
          value={data?.counts.totalLabReports ?? 0}
          icon={FileText}
          bg="#EEF2FF"
          iconColor="#4F46E5"
          sublabel="Uploaded PDFs"
        />
        <StatCard
          label="Uploaded Today"
          value={data?.counts.reportsUploadedToday ?? 0}
          icon={TrendingUp}
          bg="#ECFDF5"
          iconColor="#059669"
          sublabel="Reports finalized"
        />
        <StatCard
          label="Pending Reports"
          value={data?.counts.pendingReports ?? 0}
          icon={AlertTriangle}
          bg="#FFFBEB"
          iconColor="#D97706"
          sublabel="Awaiting completion"
        />
        <StatCard
          label="Active Lab Technicians"
          value={data?.counts.activeLabTechnicians ?? 0}
          icon={UserCog}
          bg="#FDF4FF"
          iconColor="#A855F7"
          sublabel="Lab staff accounts"
          to="/hospital/staff"
        />
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              title: "Manage Departments",
              desc: "Enable or disable departments",
              icon: FolderOpen,
              to: "/hospital/departments",
              color: "#0EA5E9",
              bg: "#EFF6FF",
            },
            {
              title: "View Patients",
              desc: "Patient directory",
              icon: Users,
              to: "/hospital/patients",
              color: "#8B5CF6",
              bg: "#F5F3FF",
            },
            {
              title: "Manage Staff",
              desc: "Add or update team members",
              icon: UserCog,
              to: "/hospital/staff",
              color: "#22C55E",
              bg: "#F0FDF4",
            },
            {
              title: "Manage Doctors",
              desc: "View affiliated providers",
              icon: Stethoscope,
              to: "/hospital/doctors",
              color: "#F97316",
              bg: "#FFF7ED",
            },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-all group"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: a.bg }}
              >
                <a.icon size={18} style={{ color: a.color }} />
              </div>
              <p className="font-semibold text-slate-800 text-sm group-hover:text-sky-600 transition-colors">
                {a.title}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Unrouted alert ── */}
      {(unroutedLabs > 0 || unroutedRx > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Some orders aren't routed yet</p>
            <p className="mt-0.5">
              {unroutedLabs} lab order(s) and {unroutedRx} prescription(s) from
              your doctors have no matching unit.
            </p>
            <Link
              to="/hospital/units"
              className="inline-flex items-center gap-1 mt-2 font-semibold text-amber-900 hover:underline"
            >
              Manage Units <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Department statistics + recent patients ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div
          className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <FolderOpen size={18} className="text-sky-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Department Statistics
              </h3>
              <p className="text-xs text-slate-400">
                Real doctors and patients by department
              </p>
            </div>
            <Link
              to="/hospital/departments"
              className="ml-auto text-xs text-sky-600 font-medium hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          {data?.departmentStats && data.departmentStats.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {data.departmentStats.slice(0, 6).map((d) => (
                <div
                  key={d.id}
                  className="px-5 py-3 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-sm text-slate-700 truncate">
                      {d.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-shrink-0">
                      <span>
                        <strong className="text-slate-800">
                          {d.doctor_count}
                        </strong>{" "}
                        doctors
                      </span>
                      <span>
                        <strong className="text-slate-800">
                          {d.patient_count}
                        </strong>{" "}
                        patients
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Number(d.patient_count || 0) * 12
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No department statistics available yet.
            </div>
          )}
        </div>

        <div
          className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <Users size={18} className="text-sky-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Recent Patients
              </h3>
              <p className="text-xs text-slate-400">
                Latest patients from hospital appointments
              </p>
            </div>
            <Link
              to="/hospital/patients"
              className="ml-auto text-xs text-sky-600 font-medium hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>
          {data?.recentPatients && data.recentPatients.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {data.recentPatients.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {p.first_name} {p.last_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      MRN: {p.mrn} {p.sex ? `· ${p.sex}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-slate-400">Last Visit</p>
                    <p className="text-xs font-medium text-slate-600">
                      {p.last_visit ? fmtDate(p.last_visit) : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No recent patients found.
            </div>
          )}
        </div>
      </div>

      {/* ── Two-col: unit workload + recent appointments ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Unit workload */}
        {data?.units && data.units.length > 0 && (
          <div
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <Activity size={18} className="text-sky-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Unit Workload
                </h3>
                <p className="text-xs text-slate-400">
                  Pending orders per unit
                </p>
              </div>
              <Link
                to="/hospital/units"
                className="ml-auto text-xs text-sky-600 font-medium hover:underline flex items-center gap-1"
              >
                Manage <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {data.units.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        u.type === "LAB"
                          ? "bg-sky-50 text-sky-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {u.type === "LAB" ? (
                        <FlaskConical size={16} />
                      ) : (
                        <Pill size={16} />
                      )}
                    </div>
                    <span className="font-medium text-slate-700 text-sm truncate">
                      {u.name}
                    </span>
                  </div>
                  <span className="text-sm">
                    <span className="font-bold text-slate-800 tabular-nums">
                      {u.pending}
                    </span>{" "}
                    <span className="text-slate-400">pending</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Appointments */}
        {data?.recentAppointments && data.recentAppointments.length > 0 && (
          <div
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <Calendar size={18} className="text-sky-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Recent Appointments
                </h3>
                <p className="text-xs text-slate-400">Last 5 appointments</p>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {data.recentAppointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between px-5 py-3 hover:bg-slate-50/60 transition"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-700 leading-tight">
                      {a.patient_name}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Stethoscope size={11} /> Dr. {a.doctor_name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-slate-500">
                      {fmtDate(a.scheduled_at)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {fmtTime(a.scheduled_at)}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        STATUS_CLS[a.status] ?? "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Get started card (shown if very little data) ── */}
      {(data?.counts.departments ?? 0) === 0 && (
        <div
          className="bg-white rounded-2xl border border-slate-100 p-6"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp size={18} className="text-sky-500" />
            <h3 className="font-bold text-slate-800">Get started</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Add departments to your hospital so patients can find and book
            appointments. Then create lab and pharmacy units and add staff.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/hospital/departments"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition"
            >
              <FolderOpen size={15} /> Add Departments
            </Link>
            <Link
              to="/hospital/units"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
            >
              <Layers size={15} /> Manage Units
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
