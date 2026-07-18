import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  LogIn,
  UserPlus,
} from "lucide-react";

import {
  getAuditLogs,
  type AuditLog,
} from "../../api/admin.api";

const actionMeta: Record<
  string,
  { label: string; icon: any; color: string }
> = {
  LOGIN: {
    label: "Login",
    icon: LogIn,
    color: "text-blue-600 bg-blue-50",
  },
  ACCOUNT_CREATED: {
    label: "Account created",
    icon: UserPlus,
    color: "text-violet-600 bg-violet-50",
  },
  DOCTOR_APPROVED: {
    label: "Doctor approved",
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-50",
  },
  DOCTOR_REJECTED: {
    label: "Doctor rejected",
    icon: XCircle,
    color: "text-rose-600 bg-rose-50",
  },
  ADMIN_VIEW_DOCTORS_LIST: {
    label: "Admin viewed doctors list",
    icon: Activity,
    color: "text-slate-600 bg-slate-100",
  },
  ADMIN_VIEW_PATIENTS_LIST: {
    label: "Admin viewed patients list",
    icon: Activity,
    color: "text-slate-600 bg-slate-100",
  },
  ADMIN_VIEW_PATIENT: {
    label: "Admin viewed patient",
    icon: Activity,
    color: "text-slate-600 bg-slate-100",
  },
  ADMIN_VIEW_DOCTOR_SCHEDULE: {
    label: "Admin viewed doctor schedule",
    icon: Activity,
    color: "text-slate-600 bg-slate-100",
  },
};

const timeAgo = (value: string) => {
  const then = new Date(value).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);

  if (Number.isNaN(then)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const RecentActivity = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null
  );

  useEffect(() => {
    let active = true;

    getAuditLogs({ limit: 10 })
      .then((res) => {
        if (!active) return;
        setLogs(res.data.data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Failed to load activity"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-white rounded-2xl shadow-sm h-full flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Activity size={16} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-800">
            Recent Activity
          </h3>
        </div>
      </header>

      <div className="flex-1 px-5 py-3 overflow-auto">
        {loading && (
          <p className="text-sm text-slate-400 py-6 text-center">
            Loading activity…
          </p>
        )}

        {error && (
          <p className="text-sm text-rose-500 py-6 text-center">
            {error}
          </p>
        )}

        {!loading && !error && logs.length === 0 && (
          <p className="text-sm text-slate-400 py-6 text-center">
            No activity recorded yet.
          </p>
        )}

        <ul className="divide-y divide-slate-100">
          {logs.map((log) => {
            const meta =
              actionMeta[log.action] || {
                label: log.action,
                icon: Activity,
                color: "text-slate-600 bg-slate-100",
              };

            const Icon = meta.icon;
            const failed =
              log.success === false ||
              log.success === 0;

            return (
              <li
                key={log.id}
                className="py-3 flex items-start gap-3"
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${meta.color}`}
                >
                  <Icon size={14} />
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {meta.label}
                    {failed && (
                      <span className="ml-2 text-[10px] font-semibold text-rose-500">
                        FAILED
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-slate-500 truncate">
                    {log.actor_email ||
                      log.patient_name ||
                      log.actor_role ||
                      "System"}
                    {log.reason ? ` — ${log.reason}` : ""}
                  </p>
                </div>

                <span className="text-[11px] text-slate-400 shrink-0">
                  {timeAgo(log.occurred_at)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default RecentActivity;
