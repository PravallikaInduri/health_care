import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  Pill,
  FlaskConical,
  Stethoscope,
  Video,
  XCircle,
  RefreshCw,
  Building2,
  ChevronRight,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getMyAppointments,
  getMyPrescriptions,
  getInsurance,
  getEncounters,
  getMyEmergencyContacts,
  getPatientProfile,
  cancelAppointment,
  requestRefill,
  type PatientPrescription,
  type PatientInsurance,
  type PatientEncounter,
  type PatientEmergencyContact,
} from "../../api/patient.api";
import { getMyLabReports, type LabReport } from "../../api/labReports.api";
import { listThreads, type MessageThread } from "../../api/messages.api";
import { formatDoctorName } from "../../utils/doctorName";

/* ================================================================
   Type — appointment shape returned by API
================================================================ */
interface MyAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  type: string;
  reason: string | null;
  doctor_name: string;
  provider_id?: string;
  facility_id?: string | null;
  facility_name?: string | null;
  specialty?: string | null;
}

/* ================================================================
   Formatting helpers
================================================================ */
const fmtDate = (v?: string | null) =>
  v
    ? new Date(v).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const fmtTime = (v?: string | null) =>
  v
    ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

/* ================================================================
   Summary stat card — clean, minimal
================================================================ */
interface StatProps {
  icon: any;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  sub?: string;
  to?: string;
}

const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, sub, to }: StatProps) => {
  const inner = (
    <div
      className="bg-white rounded-2xl p-5 flex items-start gap-4 h-full transition-shadow hover:shadow-md"
      style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
        <p className="text-[13px] font-medium text-slate-600 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1 truncate">{sub}</p>}
      </div>
      {to && <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />}
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {inner}
    </Link>
  ) : (
    <div className="h-full">{inner}</div>
  );
};

/* ================================================================
   Section card wrapper
================================================================ */
const Card = ({
  title,
  icon: Icon,
  iconBg = "#EFF6FF",
  iconColor = "#0284C7",
  action,
  children,
  noPad = false,
}: {
  title: string;
  icon?: any;
  iconBg?: string;
  iconColor?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPad?: boolean;
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
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            <Icon size={15} />
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

/* ================================================================
   Main Dashboard
================================================================ */
const Dashboard = () => {
  const navigate = useNavigate();

  /* ── state ── */
  const [appointments, setAppointments] = useState<MyAppointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [labs, setLabs] = useState<LabReport[]>([]);
  const [, setInsurance] = useState<PatientInsurance[]>([]);
  const [, setEncounters] = useState<PatientEncounter[]>([]);
  const [, setContacts] = useState<PatientEmergencyContact[]>([]);
  const [, setThreads] = useState<MessageThread[]>([]);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelBusy, setCancelBusy] = useState<string | null>(null);
  const [refillBusy, setRefillBusy] = useState<string | null>(null);

  /* ── load ── */
  const loadAll = async () => {
    setLoading(true);
    const safe = <X,>(p: Promise<X>, fb: X) => p.catch(() => fb);
    const [apptsR, rxR, labR, insR, encR, ecR, msgR, profR] = await Promise.all([
      safe(getMyAppointments(), { data: { data: [] } } as any),
      safe(getMyPrescriptions(), { data: { data: [] } } as any),
      safe(getMyLabReports(), { data: { data: [] } } as any),
      safe(getInsurance(), { data: { data: [] } } as any),
      safe(getEncounters({ page: 1, limit: 10 }), { data: { data: [] } } as any),
      safe(getMyEmergencyContacts(), { data: { data: [] } } as any),
      safe(listThreads(), { data: { data: [] } } as any),
      safe(getPatientProfile(), null as any),
    ]);
    setAppointments(apptsR?.data?.data ?? []);
    setPrescriptions(rxR?.data?.data ?? []);
    setLabs(labR?.data?.data ?? []);
    setInsurance(insR?.data?.data ?? []);
    setEncounters(encR?.data?.data ?? []);
    setContacts(ecR?.data?.data ?? []);
    setThreads(msgR?.data?.data ?? []);
    const prof = profR?.data?.data ?? profR?.data ?? null;
    setFirstName(
      prof?.first_name ||
        prof?.firstName ||
        (prof?.name && String(prof.name).split(" ")[0]) ||
        null
    );
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  /* ── derived ── */
  const now = new Date();

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            String(a.status).toUpperCase() !== "CANCELLED" &&
            String(a.status).toUpperCase() !== "COMPLETED" &&
            new Date(a.scheduled_at) >= now
        )
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [appointments]
  );

  const nextAppt = upcomingAppointments[0];

  const activePrescriptions = useMemo(
    () => prescriptions.filter((p) => String(p.status).toUpperCase() === "ACTIVE"),
    [prescriptions]
  );

  const pendingLabs = useMemo(
    () =>
      labs.filter((l) => {
        const s = String(l.status ?? "").toUpperCase();
        return s !== "UPLOADED" && s !== "COMPLETED" && s !== "CANCELLED";
      }),
    [labs]
  );

  const completedVisits = useMemo(
    () => appointments.filter((a) => String(a.status).toUpperCase() === "COMPLETED").length,
    [appointments]
  );

  /* ── actions ── */
  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      setCancelBusy(id);
      await cancelAppointment(id);
      toast.success("Appointment cancelled");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not cancel");
    } finally {
      setCancelBusy(null);
    }
  };

  const handleRefill = async (id: string) => {
    try {
      setRefillBusy(id);
      await requestRefill(id);
      toast.success("Refill request sent");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not request refill");
    } finally {
      setRefillBusy(null);
    }
  };

  /* ── loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: "#BFDBFE", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <div className="space-y-6" style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#0F172A" }}>
            Patient Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            {today}{firstName ? `  ·  Hello, ${firstName}` : ""}
          </p>
        </div>
        <Link
          to="/patient/hospitals"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg,#0EA5E9,#0284C7)",
            boxShadow: "0 4px 12px rgba(14,165,233,0.30)",
          }}
        >
          <CalendarDays size={14} />
          Book Appointment
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW 1 — 4 summary stat cards
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarDays}
          iconBg="#DBEAFE"
          iconColor="#1D4ED8"
          label="Upcoming Appointments"
          value={upcomingAppointments.length}
          sub={nextAppt ? `Next: ${fmtDate(nextAppt.scheduled_at)}` : "None scheduled"}
          to="/patient/appointments"
        />
        <StatCard
          icon={Pill}
          iconBg="#EDE9FE"
          iconColor="#7C3AED"
          label="Active Prescriptions"
          value={activePrescriptions.length}
          sub={activePrescriptions.length > 0 ? `${activePrescriptions[0]?.medication_name ?? ""}` : "No active medications"}
          to="/patient/prescriptions"
        />
        <StatCard
          icon={FlaskConical}
          iconBg="#CCFBF1"
          iconColor="#0D9488"
          label="Lab Reports"
          value={labs.length}
          sub={`${pendingLabs.length} pending result${pendingLabs.length === 1 ? "" : "s"}`}
          to="/patient/labs"
        />
        <StatCard
          icon={TrendingUp}
          iconBg="#D1FAE5"
          iconColor="#059669"
          label="Total Visits"
          value={completedVisits}
          sub="Completed appointments"
          to="/patient/appointments"
        />
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW 2 — Next appointment + Healthcare overview
      ══════════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Next appointment — 3/5 */}
        <div className="lg:col-span-3">
          <Card
            icon={CalendarDays}
            iconBg="#DBEAFE"
            iconColor="#1D4ED8"
            title="Next Appointment"
            action={<ViewAll to="/patient/appointments" label="All appointments" />}
          >
            {!nextAppt ? (
              <div className="flex flex-col items-center py-8 text-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "#F1F5F9", color: "#94A3B8" }}
                >
                  <CalendarDays size={26} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">No upcoming appointments</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Book a visit with one of our healthcare providers.
                  </p>
                </div>
                <Link
                  to="/patient/hospitals"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
                >
                  <CalendarDays size={14} /> Book now
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Doctor info row */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
                  >
                    <Stethoscope size={22} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">
                      {formatDoctorName(nextAppt.doctor_name)}
                    </p>
                    {nextAppt.specialty && (
                      <p className="text-xs text-slate-500 mt-0.5">{nextAppt.specialty}</p>
                    )}
                  </div>
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                    style={
                      nextAppt.type === "VIDEO"
                        ? { backgroundColor: "#EDE9FE", color: "#7C3AED" }
                        : { backgroundColor: "#D1FAE5", color: "#059669" }
                    }
                  >
                    {nextAppt.type === "VIDEO" ? "Telehealth" : "In-person"}
                  </span>
                </div>

                {/* Detail chips */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: "#F8FAFC", color: "#475569", border: "1px solid #E2E8F0" }}
                  >
                    <CalendarDays size={12} /> {fmtDate(nextAppt.scheduled_at)}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: "#F8FAFC", color: "#475569", border: "1px solid #E2E8F0" }}
                  >
                    <Clock size={12} /> {fmtTime(nextAppt.scheduled_at)}
                  </span>
                  {nextAppt.facility_name && (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: "#F8FAFC", color: "#475569", border: "1px solid #E2E8F0" }}
                    >
                      <Building2 size={12} /> {nextAppt.facility_name}
                    </span>
                  )}
                </div>

                {nextAppt.reason && (
                  <p className="text-xs text-slate-500 line-clamp-1">
                    <span className="font-medium">Reason:</span> {nextAppt.reason}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {nextAppt.type === "VIDEO" && (
                    <button
                      onClick={() => navigate("/patient/appointments")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}
                    >
                      <Video size={13} /> Join call
                    </button>
                  )}
                  <Link
                    to="/patient/hospitals"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-sky-50"
                    style={{ color: "#0284C7", borderColor: "#BFDBFE" }}
                  >
                    Reschedule
                  </Link>
                  <button
                    onClick={() => handleCancel(nextAppt.id)}
                    disabled={cancelBusy === nextAppt.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-red-50 disabled:opacity-60"
                    style={{ color: "#DC2626", borderColor: "#FECACA" }}
                  >
                    <XCircle size={13} />
                    {cancelBusy === nextAppt.id ? "Cancelling…" : "Cancel"}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Healthcare overview — 2/5 */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Active prescriptions mini */}
          <Card
            icon={Pill}
            iconBg="#EDE9FE"
            iconColor="#7C3AED"
            title="Active Prescriptions"
            action={<ViewAll to="/patient/prescriptions" />}
          >
            {activePrescriptions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                No active prescriptions.
              </p>
            ) : (
              <ul className="space-y-2">
                {activePrescriptions.slice(0, 3).map((p) => {
                  const rem = (p.refills_allowed ?? 0) - (p.refills_used ?? 0);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-1.5"
                      style={{ borderBottom: "1px solid #F8FAFC" }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {p.medication_name ?? "Medication"}
                        </p>
                        <p className="text-[10.5px] text-slate-400 truncate">
                          {[p.dose, p.frequency].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={
                            rem > 0
                              ? { backgroundColor: "#D1FAE5", color: "#059669" }
                              : { backgroundColor: "#FEE2E2", color: "#DC2626" }
                          }
                        >
                          {rem}R
                        </span>
                        <button
                          onClick={() => handleRefill(p.id)}
                          disabled={refillBusy === p.id || rem <= 0}
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg text-white disabled:opacity-50"
                          style={{ background: "#7C3AED" }}
                        >
                          <RefreshCw size={9} className={refillBusy === p.id ? "animate-spin inline" : "inline"} />
                        </button>
                      </div>
                    </li>
                  );
                })}
                {activePrescriptions.length > 3 && (
                  <p className="text-[11px] text-slate-400 pt-1">
                    +{activePrescriptions.length - 3} more
                  </p>
                )}
              </ul>
            )}
          </Card>

          {/* Recent lab results mini */}
          <Card
            icon={FlaskConical}
            iconBg="#CCFBF1"
            iconColor="#0D9488"
            title="Recent Lab Reports"
            action={<ViewAll to="/patient/labs" />}
          >
            {labs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No lab reports yet.</p>
            ) : (
              <ul className="space-y-2">
                {labs.slice(0, 3).map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 py-1"
                    style={{ borderBottom: "1px solid #F8FAFC" }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                          {l.report_name || l.test_name || "Lab report"}
                      </p>
                      <p className="text-[10.5px] text-slate-400">
                        {l.hospital_name || "Uploaded lab report"}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={
                        String(l.status ?? "").toUpperCase() === "UPLOADED" ||
                        String(l.status ?? "").toUpperCase() === "COMPLETED"
                          ? { backgroundColor: "#D1FAE5", color: "#059669" }
                          : { backgroundColor: "#FEF3C7", color: "#D97706" }
                      }
                    >
                      {l.status ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW 3 — All upcoming appointments list
      ══════════════════════════════════════════════════════════ */}
      {upcomingAppointments.length > 0 && (
        <Card
          icon={CalendarDays}
          iconBg="#DBEAFE"
          iconColor="#1D4ED8"
          title={`Upcoming Appointments (${upcomingAppointments.length})`}
          action={<ViewAll to="/patient/appointments" />}
          noPad
        >
          <ul className="divide-y divide-slate-50">
            {upcomingAppointments.slice(0, 6).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#EFF6FF", color: "#1D4ED8" }}
                  >
                    <Stethoscope size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {formatDoctorName(a.doctor_name)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fmtDate(a.scheduled_at)} · {fmtTime(a.scheduled_at)}
                      {a.facility_name ? ` · ${a.facility_name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                    style={
                      a.type === "VIDEO"
                        ? { backgroundColor: "#EDE9FE", color: "#7C3AED" }
                        : { backgroundColor: "#DBEAFE", color: "#1D4ED8" }
                    }
                  >
                    {a.type === "VIDEO" ? "Telehealth" : "In-person"}
                  </span>
                  <button
                    onClick={() => handleCancel(a.id)}
                    disabled={cancelBusy === a.id}
                    className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {cancelBusy === a.id ? "…" : "Cancel"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
