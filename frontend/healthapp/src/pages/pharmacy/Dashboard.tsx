import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  RefreshCw,
  Hospital,
  AlertTriangle,
  ArrowRight,
  Check,
  Pill,
  Building2,
  Activity,
  ClipboardList,
  Search,
  ListChecks,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getPharmacyStats,
  getPharmacyMe,
  listPharmacyPrescriptions,
  listRefillRequests,
  dispensePrescription,
  dispenseRefillRequest,
  type PharmacyStats,
  type PharmacyMe,
  type Prescription,
  type RefillRequest,
} from "../../api/pharmacy.api";
import {
  DashboardHero,
  StatCard,
  ActionCard,
  SectionCard,
} from "../../components/dashboard";

const fmtName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(" ") || "Unknown patient";

const timeAgo = (iso?: string | null) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const PharmacyDashboard = () => {
  const [stats, setStats] = useState<PharmacyStats | null>(null);
  const [me, setMe] = useState<PharmacyMe | null>(null);
  const [queue, setQueue] = useState<Prescription[]>([]);
  const [refills, setRefills] = useState<RefillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, meRes, rxRes, rrRes] = await Promise.all([
        getPharmacyStats(),
        getPharmacyMe(),
        listPharmacyPrescriptions({ status: "ACTIVE", limit: 5 }),
        listRefillRequests({ status: "APPROVED", limit: 5 }),
      ]);
      setStats(statsRes.data.data);
      setMe(meRes.data.data);
      setQueue(rxRes.data.data ?? []);
      setRefills(rrRes.data.data ?? []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to load pharmacy dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const primary = me?.primaryFacility ?? null;
  const unassigned = !!me && (!primary || me.facilities.length === 0);

  const oldestActiveId = useMemo(
    () => (queue.length > 0 ? queue[queue.length - 1].id : null),
    [queue]
  );

  const handleDispense = async (rx: Prescription) => {
    if (busyId) return;
    setBusyId(rx.id);
    try {
      await dispensePrescription(rx.id);
      toast.success(
        `Dispensed ${rx.medication_name ?? "prescription"} for ${fmtName(
          rx.first_name,
          rx.last_name
        )}`
      );
      await loadAll();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Could not dispense"
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDispenseRefill = async (rr: RefillRequest) => {
    if (busyId) return;
    setBusyId(rr.id);
    try {
      await dispenseRefillRequest(rr.id);
      toast.success(
        `Refill dispensed for ${fmtName(rr.first_name, rr.last_name)}`
      );
      await loadAll();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Could not dispense refill"
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-72">
        <div className="h-12 w-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || !me) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-rose-500">
        Could not load pharmacy dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Pharmacy"
        title={primary?.name ?? "No pharmacy assignment"}
        subtitle={
          primary?.address ||
          "Dispense prescriptions and doctor-approved refills, and keep patients safe."
        }
        icon={Building2}
        meta={
          primary?.hospital_name ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white ring-1 ring-white/30 text-xs font-medium">
              <Hospital size={12} />
              {primary.hospital_name}
            </span>
          ) : null
        }
        actions={
          <>
            <button
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/25 transition disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
            {oldestActiveId && (
              <Link
                to={`/pharmacy/prescriptions/${oldestActiveId}`}
                className="inline-flex items-center gap-2 bg-white text-brand-700 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-brand-50 transition"
              >
                Dispense next <ArrowRight size={14} />
              </Link>
            )}
          </>
        }
      />

      {unassigned && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-amber-800">
          <AlertTriangle size={20} className="mt-0.5" />
          <div>
            <p className="font-semibold">
              No pharmacy facility assigned to this account
            </p>
            <p className="text-sm">
              Ask an administrator to add you to a pharmacy in
              <span className="font-medium"> facility_staff </span>
              so prescriptions can be routed to your queue.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Awaiting dispense"
          value={stats.pendingPrescriptions}
          icon={Clock}
          tone="amber"
          sublabel={
            stats.pendingPrescriptions === 0
              ? "Inbox is clear"
              : "Routed to your pharmacy"
          }
          to="/pharmacy/prescriptions?status=ACTIVE"
        />
        <StatCard
          label="Dispensed today"
          value={stats.dispensedToday}
          icon={CheckCircle2}
          tone="emerald"
          sublabel={new Date().toLocaleDateString()}
          to="/pharmacy/prescriptions?status=DISPENSED"
        />
        <StatCard
          label="Pending refills"
          value={stats.pendingRefills}
          icon={RefreshCw}
          tone="violet"
          sublabel={
            stats.pendingRefills === 0
              ? "Nothing to dispense"
              : "Approved, ready to dispense"
          }
          to="/pharmacy/refill-requests?status=APPROVED"
        />
        <StatCard
          label="Active total"
          value={stats.pendingPrescriptions + stats.pendingRefills}
          icon={Activity}
          tone="teal"
          sublabel="Work in your queue"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800">
            Quick actions
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionCard
            title="Dispense queue"
            description="Active prescriptions waiting."
            icon={Pill}
            to="/pharmacy/prescriptions?status=ACTIVE"
            primary
          />
          <ActionCard
            title="Refill requests"
            description="Dispense doctor-approved refills."
            icon={RefreshCw}
            to="/pharmacy/refill-requests?status=APPROVED"
          />
          <ActionCard
            title="Search prescriptions"
            description="Look up any patient script."
            icon={Search}
            to="/pharmacy/prescriptions"
          />
          <ActionCard
            title="Dispense history"
            description="Audit trail of dispenses."
            icon={ClipboardList}
            to="/pharmacy/prescriptions?status=DISPENSED"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard
          title="Awaiting dispense"
          subtitle="Oldest prescriptions in your queue"
          icon={Pill}
          action={
            <Link
              to="/pharmacy/prescriptions?status=ACTIVE"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              View all <ArrowRight size={12} />
            </Link>
          }
        >
          {queue.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 size={26} />
              </div>
              <p className="text-sm font-medium text-slate-600">
                Inbox is clear
              </p>
              <p className="text-xs text-slate-400 mt-1">
                No prescriptions routed to your pharmacy yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 -mx-1">
              {queue.map((rx) => (
                <li
                  key={rx.id}
                  className="px-1 py-3 flex items-center gap-3 hover:bg-slate-50/60 transition rounded-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Pill size={18} />
                  </div>
                  <Link
                    to={`/pharmacy/prescriptions/${rx.id}`}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {rx.medication_name ?? "Medication"}
                      {rx.dose && (
                        <span className="font-normal text-slate-500">
                          {" · "}
                          {rx.dose}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {fmtName(rx.first_name, rx.last_name)}
                      {rx.mrn && ` · MRN ${rx.mrn}`}
                      {" · "}
                      <span className="text-slate-400">
                        {timeAgo(rx.prescribed_at)}
                      </span>
                    </p>
                  </Link>
                  <button
                    onClick={() => handleDispense(rx)}
                    disabled={busyId === rx.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 transition"
                  >
                    {busyId === rx.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Dispense
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Pending refills"
          subtitle="Doctor-approved refills ready to dispense"
          icon={RefreshCw}
          action={
            <Link
              to="/pharmacy/refill-requests?status=APPROVED"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              View all <ArrowRight size={12} />
            </Link>
          }
        >
          {refills.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <ListChecks size={26} />
              </div>
              <p className="text-sm font-medium text-slate-600">
                Nothing pending
              </p>
              <p className="text-xs text-slate-400 mt-1">
                No refill requests waiting on you.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 -mx-1">
              {refills.map((rr) => {
                const remaining =
                  (rr.refills_allowed ?? 0) - (rr.refills_used ?? 0);
                return (
                  <li
                    key={rr.id}
                    className="px-1 py-3 flex items-center gap-3 hover:bg-slate-50/60 transition rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center flex-shrink-0">
                      <RefreshCw size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {rr.medication_name ?? "Medication"}
                        {rr.dose && (
                          <span className="font-normal text-slate-500">
                            {" · "}
                            {rr.dose}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {fmtName(rr.first_name, rr.last_name)}
                        {rr.mrn && ` · MRN ${rr.mrn}`}
                        {" · "}
                        <span className="text-slate-400">
                          {timeAgo(rr.requested_at)}
                        </span>
                        {" · "}
                        <span
                          className={
                            remaining > 0
                              ? "text-emerald-600 font-medium"
                              : "text-rose-600 font-medium"
                          }
                        >
                          {remaining} left
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDispenseRefill(rr)}
                        disabled={busyId === rr.id}
                        title="Dispense refill"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-40 transition"
                      >
                        <Check size={12} /> Dispense
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
