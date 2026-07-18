import { useEffect, useState } from "react";
import {
  Clock,
  CheckCircle2,
  Users,
  Building2,
  Hospital,
  Stethoscope,
  FlaskConical,
  Pill,
  RefreshCw,
  TestTube,
  ShieldCheck,
  Activity,
} from "lucide-react";

import {
  getAdminStats,
  type AdminStats,
} from "../../api/admin.api";
import StatCard from "../../components/admin/StatCard";
import RecentActivity from "../../components/admin/RecentActivity";
import PendingDoctorRequests from "../../components/admin/PendingDoctorRequests";
import QuickActions from "../../components/admin/QuickActions";
import RecentPatients from "../../components/admin/RecentPatients";

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getAdminStats()
      .then((res) => {
        if (!active) return;
        setStats(res.data.data);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Failed to load stats"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const display = (value?: number) =>
    loading ? "…" : String(value ?? 0);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-rose-50 text-rose-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* ===================== HERO ===================== */}
      <section
        className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 px-6 py-6 md:py-7"
        style={{ boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
      >
        {/* soft azure wash on the right */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
          style={{
            background:
              "linear-gradient(135deg, rgba(224,247,255,0) 0%, rgba(186,230,253,0.6) 100%)",
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
                boxShadow: "0 10px 24px rgba(14, 165, 233, 0.25)",
              }}
            >
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-sky-700">
                Operations Overview
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                Welcome, Admin{" "}
                <span className="inline-block">👋</span>
              </h1>
              <p className="text-slate-500 text-sm md:text-[15px] mt-1">
                Verifications, facilities and clinical queues — all at a
                glance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 text-xs font-semibold">
              <Activity size={12} /> System healthy
            </span>
          </div>
        </div>
      </section>

      {/* Top row — KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Doctors"
          value={display(stats?.pendingDoctors)}
          hint="Awaiting verification"
          icon={Clock}
          accent="amber"
        />
        <StatCard
          title="Approved Doctors"
          value={display(stats?.approvedDoctors)}
          hint="Active providers"
          icon={CheckCircle2}
          accent="emerald"
        />
        <StatCard
          title="Total Patients"
          value={display(stats?.totalPatients)}
          hint="Registered users"
          icon={Users}
          accent="blue"
        />
        <StatCard
          title="Facilities"
          value={display(stats?.facilities)}
          hint="Care locations"
          icon={Building2}
          accent="violet"
        />
      </div>

      {/* Facility breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Hospitals"
          value={display(stats?.facilityBreakdown?.hospitals)}
          hint="Inpatient care centers"
          icon={Hospital}
          accent="blue"
        />
        <StatCard
          title="Clinics"
          value={display(stats?.facilityBreakdown?.clinics)}
          hint="Outpatient locations"
          icon={Stethoscope}
          accent="emerald"
        />
        <StatCard
          title="Labs"
          value={display(stats?.facilityBreakdown?.labs)}
          hint="Diagnostic centers"
          icon={FlaskConical}
          accent="violet"
        />
      </div>

      {/* Sprint 12 — clinical workload queues across the hospital */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Hospital queues
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Pending Prescriptions"
            value={display(stats?.pendingPrescriptions)}
            hint="ACTIVE, awaiting dispense"
            icon={Pill}
            accent="amber"
          />
          <StatCard
            title="Pending Refills"
            value={display(stats?.pendingRefills)}
            hint="Patient-requested refills"
            icon={RefreshCw}
            accent="violet"
          />
          <StatCard
            title="Pending Lab Orders"
            value={display(stats?.pendingLabOrders)}
            hint="ORDERED, awaiting results"
            icon={TestTube}
            accent="blue"
          />
        </div>
      </div>

      {/* Second row — pending requests + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PendingDoctorRequests />
        </div>
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>

      {/* Third row — recent patients + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentPatients />
        <RecentActivity />
      </div>
    </div>
  );
};

export default AdminDashboard;
