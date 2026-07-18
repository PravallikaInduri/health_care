import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  AlertOctagon,
} from "lucide-react";

import {
  getDoctorSchedule,
  type AdminDoctorSchedule,
} from "../../api/admin.api";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const StatusPill = ({ active }: { active: boolean }) => (
  <span
    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
      active
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-500"
    }`}
  >
    {active ? "Active" : "Inactive"}
  </span>
);

const DoctorSchedule = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] =
    useState<AdminDoctorSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;
    setLoading(true);
    setError(null);

    getDoctorSchedule(id)
      .then((res) => {
        if (!active) return;
        setData(res.data.data);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Failed to load schedule"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <p className="text-slate-400">Loading schedule…</p>;
  }

  if (error) {
    return <p className="text-rose-500">{error}</p>;
  }

  if (!data) {
    return (
      <p className="text-slate-500">Schedule not found.</p>
    );
  }

  const { provider, templates, overrides, availabilitySummary } = data;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/doctors"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Back to doctors
      </Link>

      <header className="bg-white rounded-3xl shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {provider.name}
          </h1>
          <p className="text-slate-500">
            {provider.specialty || "—"} · {provider.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
            {provider.verification_status}
          </span>
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
              provider.accepting_new
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {provider.accepting_new
              ? "Accepting patients"
              : "Not accepting"}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
            Read-only view
          </span>
        </div>
      </header>

      {/* Availability summary */}
      <section className="bg-white rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock size={20} className="text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-800">
            Availability — next 7 days
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {availabilitySummary.map((d) => (
            <div
              key={d.date}
              className="border border-slate-200 rounded-2xl p-4"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {WEEKDAYS[d.weekday]}
              </p>
              <p className="text-sm text-slate-600">
                {fmtDate(d.date)}
              </p>
              <p className="mt-3 text-2xl font-bold text-slate-800">
                {d.slotsCount}
              </p>
              <p className="text-xs text-slate-400">
                open slots
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section className="bg-white rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <CalendarDays size={20} className="text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-800">
            Schedule Templates
          </h2>
        </div>

        {templates.length === 0 ? (
          <p className="text-slate-400 text-sm">
            No schedule templates configured.
          </p>
        ) : (
          <ul className="space-y-4">
            {templates.map((t) => (
              <li
                key={t.id}
                className="border border-slate-200 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {t.template_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t.appointment_duration} min slots ·{" "}
                      buffer {t.buffer_time} min ·{" "}
                      {fmtDate(t.effective_start_date)} →{" "}
                      {t.run_indefinitely
                        ? "ongoing"
                        : fmtDate(t.effective_end_date)}
                    </p>
                  </div>
                  <StatusPill active={!!t.is_active} />
                </div>

                <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {t.blocks.length === 0 ? (
                    <p className="text-sm text-slate-400 col-span-full">
                      No weekly blocks.
                    </p>
                  ) : (
                    t.blocks.map((b) => (
                      <div
                        key={b.id}
                        className="bg-slate-50 rounded-xl p-3"
                      >
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {WEEKDAYS[b.weekday]}
                        </p>
                        <p className="text-sm font-medium text-slate-700 mt-1">
                          {b.start_time?.slice(0, 5)} –{" "}
                          {b.end_time?.slice(0, 5)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Overrides */}
      <section className="bg-white rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertOctagon size={20} className="text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-800">
            Overrides
          </h2>
        </div>

        {overrides.length === 0 ? (
          <p className="text-slate-400 text-sm">
            No overrides recorded.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {overrides.map((o) => (
              <li
                key={o.id}
                className="py-4 flex items-start justify-between flex-wrap gap-2"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {o.override_type === "UNAVAILABLE"
                      ? "Unavailable"
                      : "Extra Hours"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {fmtDateTime(o.start_datetime)} →{" "}
                    {fmtDateTime(o.end_datetime)}
                  </p>
                  {o.reason && (
                    <p className="text-sm text-slate-400 mt-1">
                      {o.reason}
                    </p>
                  )}
                </div>
                {o.action_for_existing && (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                    {o.action_for_existing.replaceAll("_", " ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default DoctorSchedule;
