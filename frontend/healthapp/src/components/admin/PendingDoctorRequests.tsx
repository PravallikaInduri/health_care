import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Stethoscope, ArrowRight } from "lucide-react";

import { getPendingDoctors } from "../../api/admin.api";

interface PendingDoctorRow {
  id: string;
  name: string;
  specialty: string | null;
  email: string;
  verification_status: string;
}

const PendingDoctorRequests = () => {
  const [doctors, setDoctors] = useState<PendingDoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getPendingDoctors()
      .then((res) => {
        if (!active) return;
        setDoctors(res.data.data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Failed to load pending doctors"
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
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Stethoscope size={16} className="text-amber-600" />
          </div>
          <h3 className="font-semibold text-slate-800">
            Pending Doctor Requests
          </h3>
        </div>
        <Link
          to="/admin/pending-doctors"
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

        {!loading && !error && doctors.length === 0 && (
          <p className="text-sm text-slate-400 py-6 text-center">
            No pending requests right now.
          </p>
        )}

        <ul className="divide-y divide-slate-100">
          {doctors.slice(0, 5).map((doc) => (
            <li
              key={doc.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                    doc.name
                  )}&background=f59e0b&color=fff`}
                  alt={doc.name}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {doc.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {doc.specialty || "—"} · {doc.email}
                  </p>
                </div>
              </div>

              <Link
                to={`/admin/doctors/${doc.id}`}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                Review
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default PendingDoctorRequests;
