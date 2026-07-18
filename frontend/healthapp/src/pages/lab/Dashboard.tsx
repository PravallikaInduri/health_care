import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FlaskConical,
  Clock,
  CheckCircle2,
  ArrowRight,
  Hospital,
  ListChecks,
  ClipboardList,
  Activity,
  Search,
} from "lucide-react";
import { getLabMe, type LabMe } from "../../api/lab.api";
import {
  DashboardHero,
  StatCard,
  ActionCard,
  SectionCard,
} from "../../components/dashboard";

const Dashboard = () => {
  const [data, setData] = useState<LabMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getLabMe();
        setData(res.data.data);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || "Failed to load lab"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-12 w-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 text-rose-700 rounded-2xl p-6">
        {error}
      </div>
    );
  }

  const totalTests = data?.counts.totalTests ?? data?.counts.total ?? 0;
  const pendingReports = data?.counts.pendingReports ?? 0;
  const completedReports = data?.counts.completedReports ?? data?.counts.completed ?? 0;
  const uploadedToday = data?.counts.uploadedToday ?? 0;

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Laboratory"
        title={data?.lab.name ?? "Laboratory"}
        subtitle={
          data?.lab.hospital_name
            ? "Track lab orders routed to your team and review uploaded results."
            : "Laboratory unit"
        }
        icon={FlaskConical}
        meta={
          data?.lab.hospital_name ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white ring-1 ring-white/30 text-xs font-medium">
              <Hospital size={12} />
              {data.lab.hospital_name}
            </span>
          ) : null
        }
        actions={
          <Link
            to="/lab/orders"
            className="inline-flex items-center gap-2 bg-white text-brand-700 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-brand-50 transition"
          >
            <ListChecks size={16} /> View Lab Orders
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tests"
          value={totalTests}
          icon={FlaskConical}
          tone="teal"
          sublabel="Assigned to this lab"
          to="/lab/orders"
        />
        <StatCard
          label="Pending Reports"
          value={pendingReports}
          icon={Clock}
          tone="amber"
          sublabel={pendingReports === 0 ? "Nothing waiting" : "Awaiting upload"}
          to="/lab/orders?status=PENDING"
        />
        <StatCard
          label="Completed Reports"
          value={completedReports}
          icon={CheckCircle2}
          tone="emerald"
          sublabel="Finalized reports"
          to="/lab/orders?status=COMPLETED"
        />
        <StatCard
          label="Uploaded Today"
          value={uploadedToday}
          icon={Activity}
          tone="violet"
          sublabel="PDF reports"
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
            title="Pending orders"
            description="Work the lab queue."
            icon={Clock}
            to="/lab/orders?status=PENDING"
            primary
          />
          <ActionCard
            title="All orders"
            description="Browse every order."
            icon={ListChecks}
            to="/lab/orders"
          />
          <ActionCard
            title="Search orders"
            description="Find by patient or ID."
            icon={Search}
            to="/lab/orders"
          />
          <ActionCard
            title="Completed history"
            description="Resulted orders archive."
            icon={ClipboardList}
            to="/lab/orders?status=COMPLETED"
          />
        </div>
      </div>

      <SectionCard
        title="Lab orders"
        subtitle="Orders that doctors route to your lab appear here"
        icon={FlaskConical}
        action={
          <Link
            to="/lab/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            Open queue <ArrowRight size={12} />
          </Link>
        }
      >
        <div className="py-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
            <FlaskConical size={26} />
          </div>
          <p className="text-sm font-medium text-slate-700">
            Manage your full order queue
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Track progress, upload results and notify the requesting
            providers in one place.
          </p>
          <Link
            to="/lab/orders"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
          >
            <ListChecks size={14} /> Open Lab Orders
          </Link>
        </div>
      </SectionCard>
    </div>
  );
};

export default Dashboard;
