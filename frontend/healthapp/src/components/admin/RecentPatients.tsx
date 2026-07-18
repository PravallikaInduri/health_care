import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";

import {
  listPatients,
  type AdminPatient,
} from "../../api/admin.api";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
};

const RecentPatients = () => {
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    listPatients({
      limit: 5,
      sortBy: "created_at",
      sortDir: "desc",
    })
      .then((res) => {
        if (!active) return;
        setPatients(res.data.data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Failed to load patients"
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
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Users size={16} className="text-emerald-600" />
          </div>
          <h3 className="font-semibold text-slate-800">
            Recent Patient Registrations
          </h3>
        </div>
        <Link
          to="/admin/patients"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
        >
          View all <ArrowRight size={14} />
        </Link>
      </header>

      <div className="flex-1 px-5 py-3 overflow-auto">
        {loading && (
          <p className="text-sm text-slate-400 py-6 text-center">
            Loading…
          </p>
        )}

        {!loading && error && (
          <p className="text-sm text-rose-500 py-6 text-center">
            {error}
          </p>
        )}

        {!loading && !error && patients.length === 0 && (
          <p className="text-sm text-slate-400 py-6 text-center">
            No patients registered yet.
          </p>
        )}

        <ul className="divide-y divide-slate-100">
          {patients.map((p) => (
            <li
              key={p.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    p.photo_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      `${p.first_name} ${p.last_name}`
                    )}&background=10b981&color=fff`
                  }
                  alt={`${p.first_name} ${p.last_name}`}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {p.first_name} {p.last_name}
                  </p>
                  <p className="text-xs text-slate-400 truncate font-mono">
                    {p.mrn}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <Link
                  to={`/admin/patients/${p.id}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  View
                </Link>
                <p className="text-[11px] text-slate-400">
                  {formatDate(p.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default RecentPatients;
