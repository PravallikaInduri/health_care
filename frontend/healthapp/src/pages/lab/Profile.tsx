import { useEffect, useState } from "react";
import {
  FlaskConical,
  Building2,
  ClipboardList,
  CheckCircle2,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

import { getLabMe, type LabMe } from "../../api/lab.api";
import SecuritySettings from "../../components/account/SecuritySettings";

const StatTile = ({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  bg: string;
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: bg, color }}
    >
      <Icon size={18} />
    </div>
    <div>
      <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  </div>
);

const LabProfile = () => {
  const [me, setMe] = useState<LabMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getLabMe();
        if (alive) setMe(res.data.data);
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || "Failed to load profile"
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-12 w-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-rose-500">
        Profile unavailable.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Identity card ── */}
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-400" />
        <div className="px-8 pb-8 -mt-12">
          <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center text-teal-600">
            <FlaskConical size={40} />
          </div>
          <h1 className="text-2xl font-bold mt-4 text-slate-900">
            {me.lab.name}
          </h1>
          <p className="text-slate-500 flex items-center gap-1.5 mt-1">
            <Building2 size={15} className="text-slate-400" />
            {me.lab.hospital_name || "Independent laboratory"}
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            <StatTile
              icon={ClipboardList}
              label="Total orders"
              value={me.counts.total}
              color="#0D9488"
              bg="#CCFBF1"
            />
            <StatTile
              icon={Clock}
              label="Pending"
              value={me.counts.pending}
              color="#D97706"
              bg="#FEF3C7"
            />
            <StatTile
              icon={CheckCircle2}
              label="Completed"
              value={me.counts.completed}
              color="#059669"
              bg="#D1FAE5"
            />
          </div>
        </div>
      </div>

      {/* ── Account security ── */}
      <SecuritySettings />
    </div>
  );
};

export default LabProfile;
