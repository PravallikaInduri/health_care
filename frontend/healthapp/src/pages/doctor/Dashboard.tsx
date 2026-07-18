import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Check,
  X,
  Stethoscope,
  Users,
  ArrowRight,
  TrendingUp,
  BellRing,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getDoctorProfile,
  getDoctorAppointments,
  updateAppointmentStatus,
} from "../../api/doctor.api";
import { formatDoctorName } from "../../utils/doctorName";
import type {
  DoctorProfile,
  DoctorAppointment,
  AppointmentStatus,
} from "../../types/doctor";

/* ── helpers ── */
const isSameDay = (date: string) =>
  new Date(date).toDateString() === new Date().toDateString();

const fmtTime = (v: string) =>
  new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const fmtDateTime = (v: string) =>
  new Date(v).toLocaleString([], { dateStyle: "medium", timeStyle: "short" } as any);

/* ── stat card ── */
const StatCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  to,
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  sub?: string;
  to?: string;
}) => {
  const inner = (
    <div
      className="bg-white rounded-2xl p-4 flex items-start gap-3 h-full transition-shadow hover:shadow-md"
      style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
        <p className="text-xs font-medium text-slate-600 mt-1">{label}</p>
        {sub && <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">{inner}</Link>
  ) : (
    <div className="h-full">{inner}</div>
  );
};

/* ── section card ── */
const Card = ({
  title,
  icon: Icon,
  iconBg = "#EFF6FF",
  iconColor = "#0284C7",
  action,
  noPad = false,
  children,
}: {
  title: string;
  icon?: any;
  iconBg?: string;
  iconColor?: string;
  action?: React.ReactNode;
  noPad?: boolean;
  children: React.ReactNode;
}) => (
  <section
    className="bg-white rounded-2xl overflow-hidden"
    style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
  >
    <header
      className="flex items-center justify-between gap-3 px-5 py-3.5"
      style={{ borderBottom: "1px solid #F1F5F9" }}
    >
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            <Icon size={14} />
          </div>
        )}
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>
      {action && <div>{action}</div>}
    </header>
    <div className={noPad ? "" : "p-5"}>{children}</div>
  </section>
);

const ViewAll = ({ to, label = "View all" }: { to: string; label?: string }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
    style={{ color: "#0284C7" }}
  >
    {label} <ArrowRight size={11} />
  </Link>
);

const statusStyle = (s: string): { bg: string; color: string } => {
  const u = s.toUpperCase();
  if (u === "COMPLETED") return { bg: "#D1FAE5", color: "#059669" };
  if (u === "CONFIRMED") return { bg: "#DBEAFE", color: "#1D4ED8" };
  if (u === "CANCELLED") return { bg: "#FEE2E2", color: "#DC2626" };
  if (u === "REQUESTED") return { bg: "#FEF3C7", color: "#D97706" };
  return { bg: "#F1F5F9", color: "#64748B" };
};

/* ================================================================ */

const DoctorDashboard = () => {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [profileData, appointmentData] = await Promise.all([
          getDoctorProfile(),
          getDoctorAppointments(),
        ]);
        setProfile(profileData);
        setAppointments(appointmentData);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleRequest = async (id: string, status: AppointmentStatus) => {
    try {
      setUpdatingId(id);
      await updateAppointmentStatus(id, status);
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success(status === "CONFIRMED" ? "Appointment confirmed" : "Appointment declined");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update appointment");
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── derived ── */
  const now = new Date();

  const todayAppointments = useMemo(
    () => appointments.filter((a) => isSameDay(a.scheduled_at)),
    [appointments]
  );

  const upcomingCount = useMemo(
    () =>
      appointments.filter(
        (a) =>
          new Date(a.scheduled_at) > now &&
          a.status !== "CANCELLED" &&
          a.status !== "COMPLETED"
      ).length,
    [appointments]
  );

  const completedCount = useMemo(
    () => appointments.filter((a) => a.status === "COMPLETED").length,
    [appointments]
  );

  const totalPatients = useMemo(
    () =>
      new Set(
        appointments
          .map((a) => `${a.first_name} ${a.last_name}`.trim())
          .filter(Boolean)
      ).size,
    [appointments]
  );

  const pendingRequests = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "REQUESTED")
        .sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ),
    [appointments]
  );

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            new Date(a.scheduled_at) > now &&
            a.status !== "CANCELLED" &&
            a.status !== "COMPLETED"
        )
        .sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        )
        .slice(0, 5),
    [appointments]
  );

  /* ── loading / error ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div
          className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: "#BFDBFE", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-5" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
        <p className="font-semibold text-red-700">Something went wrong</p>
        <p className="text-sm mt-1 text-red-600">{error}</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  /* ── render ── */
  return (
    <div className="space-y-5">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{today}</p>
          <h1 className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-2xl md:text-[28px] font-extrabold tracking-tight leading-tight">
            <span className="text-slate-700">Welcome back,</span>
            {profile?.name && (
              <span
                className="bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: "italic" }}
              >
                {formatDoctorName(profile.name)}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/doctor/appointments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)", boxShadow: "0 4px 12px rgba(14,165,233,0.25)" }}
          >
            <CalendarDays size={13} /> Schedule
          </Link>
          <Link
            to="/doctor/patients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition hover:bg-slate-50"
            style={{ color: "#475569", borderColor: "#E2E8F0" }}
          >
            <Users size={13} /> Patients
          </Link>
        </div>
      </div>

      {/* ── 4 stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarDays}
          iconBg="#DBEAFE"
          iconColor="#1D4ED8"
          label="Today's Appointments"
          value={todayAppointments.length}
          sub={todayAppointments.length > 0 ? `${fmtTime(todayAppointments[0].scheduled_at)} first slot` : "No appointments today"}
          to="/doctor/appointments"
        />
        <StatCard
          icon={Clock}
          iconBg="#EDE9FE"
          iconColor="#7C3AED"
          label="Upcoming Appointments"
          value={upcomingCount}
          sub="Confirmed ahead"
          to="/doctor/appointments"
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="#D1FAE5"
          iconColor="#059669"
          label="Completed Visits"
          value={completedCount}
          sub="All-time consultations"
          to="/doctor/appointments"
        />
        <StatCard
          icon={Users}
          iconBg="#CCFBF1"
          iconColor="#0D9488"
          label="Total Patients"
          value={totalPatients}
          sub="Unique patients seen"
          to="/doctor/patients"
        />
      </div>

      {/* ── Pending requests alert (compact) ─────────────────────── */}
      {pendingRequests.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid #FDE68A", backgroundColor: "#FFFBEB" }}
        >
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{ borderBottom: "1px solid #FDE68A" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}
            >
              <BellRing size={14} />
            </div>
            <p className="text-sm font-semibold text-amber-800">
              {pendingRequests.length} appointment request{pendingRequests.length > 1 ? "s" : ""} awaiting confirmation
            </p>
          </div>
          <ul className="divide-y divide-amber-100">
            {pendingRequests.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {a.first_name} {a.last_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fmtDateTime(a.scheduled_at)} · {a.reason || "Consultation"}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    disabled={updatingId === a.id}
                    onClick={() => handleRequest(a.id, "CONFIRMED")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <Check size={12} /> Confirm
                  </button>
                  <button
                    disabled={updatingId === a.id}
                    onClick={() => handleRequest(a.id, "CANCELLED")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                    style={{ borderColor: "#FECACA" }}
                  >
                    <X size={12} /> Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Today's schedule + upcoming ──────────────────────────── */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Today's schedule — 3/5 */}
        <div className="lg:col-span-3">
          <Card
            icon={CalendarDays}
            iconBg="#DBEAFE"
            iconColor="#1D4ED8"
            title={`Today's Schedule (${todayAppointments.length})`}
            action={<ViewAll to="/doctor/appointments" label="Full schedule" />}
            noPad
          >
            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center px-5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: "#F1F5F9", color: "#94A3B8" }}
                >
                  <CalendarDays size={22} />
                </div>
                <p className="text-sm font-semibold text-slate-600">No appointments today</p>
                <p className="text-xs text-slate-400 mt-1">
                  Enjoy a quieter day — upcoming appointments will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {todayAppointments.map((a) => {
                  const badge = statusStyle(a.status);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#EFF6FF", color: "#1D4ED8" }}
                        >
                          <Users size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {a.first_name} {a.last_name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {a.reason || "Consultation"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold tabular-nums text-slate-800">
                          {fmtTime(a.scheduled_at)}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={badge}
                        >
                          {a.status}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Upcoming appointments — 2/5 */}
        <div className="lg:col-span-2">
          <Card
            icon={TrendingUp}
            iconBg="#D1FAE5"
            iconColor="#059669"
            title="Upcoming Appointments"
            action={<ViewAll to="/doctor/appointments" />}
            noPad
          >
            {upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center px-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: "#F1F5F9", color: "#94A3B8" }}
                >
                  <Clock size={22} />
                </div>
                <p className="text-sm font-semibold text-slate-600">No upcoming appointments</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {upcomingAppointments.map((a) => {
                  const badge = statusStyle(a.status);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {a.first_name} {a.last_name}
                        </p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">
                          {new Date(a.scheduled_at).toLocaleDateString(undefined, {
                            month: "short", day: "numeric",
                          })} · {fmtTime(a.scheduled_at)}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={badge}
                      >
                        {a.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* ── Quick links ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: "/doctor/encounter",      icon: Stethoscope, label: "Encounters",    bg: "#EDE9FE", color: "#7C3AED" },
          { to: "/doctor/lab-orders",     icon: TrendingUp,  label: "Lab Orders",    bg: "#CCFBF1", color: "#0D9488" },
          { to: "/doctor/prescriptions",  icon: CheckCircle2,label: "Prescriptions", bg: "#D1FAE5", color: "#059669" },
          { to: "/doctor/schedule",       icon: Clock,       label: "My Schedule",   bg: "#FEF3C7", color: "#D97706" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white transition-shadow hover:shadow-md"
              style={{ border: "1px solid #E2E8F0" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: item.bg, color: item.color }}
              >
                <Icon size={17} />
              </div>
              <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              <ArrowRight size={13} className="ml-auto text-slate-300" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DoctorDashboard;
