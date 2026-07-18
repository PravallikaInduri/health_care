import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";

import {
  getAuditLogs,
  type AuditLog,
} from "../../api/admin.api";
import type { PaginationMeta } from "../../api/admin.api";

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] =
    useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getAuditLogs({
      page,
      limit,
      action: actionFilter || undefined,
    })
      .then((res) => {
        if (!active) return;
        setLogs(res.data.data || []);
        setPagination(res.data.pagination);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Failed to load audit logs"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, limit, actionFilter]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-800">
              Filter
            </h2>
            <p className="text-xs text-slate-500">
              Narrow by action type (e.g. LOGIN, DOCTOR_APPROVED)
            </p>
          </div>
          <input
            value={actionFilter}
            onChange={(e) => {
              setPage(1);
              setActionFilter(e.target.value);
            }}
            placeholder="Action filter"
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm w-56"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Target</th>
                <th className="px-5 py-3">Result</th>
                <th className="px-5 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-rose-500">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No audit logs match.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                logs.map((log) => {
                  const failed =
                    log.success === false || log.success === 0;
                  return (
                    <tr key={log.id}>
                      <td className="px-5 py-3 text-slate-600">
                        {new Date(log.occurred_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-slate-800">
                          {log.actor_email || log.actor_role || "System"}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {log.actor_id || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs">
                        {log.resource_type || "—"}
                        {log.resource_id ? ` · ${log.resource_id}` : ""}
                      </td>
                      <td className="px-5 py-3">
                        {failed ? (
                          <span className="text-rose-600 text-xs font-semibold">
                            FAILED{log.reason ? ` — ${log.reason}` : ""}
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs font-semibold">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 font-mono">
                        {log.ip || "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs disabled:opacity-50"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() =>
                  setPage((p) =>
                    pagination
                      ? Math.min(pagination.totalPages, p + 1)
                      : p
                  )
                }
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs disabled:opacity-50"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
