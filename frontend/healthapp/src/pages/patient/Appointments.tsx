import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hourglass,
  RefreshCw,
  Video,
} from "lucide-react";
import {
  listMyAppointments,
  cancelAppointment,
  type PatientAppointmentRow,
} from "../../api/booking.api";
import toast from "react-hot-toast";

type Tab = "upcoming" | "completed" | "cancelled";

const STATUS_BADGE: Record<string, string> = {
  BOOKED: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  RESCHEDULED: "bg-sky-50 text-sky-700",
  PENDING_REASSIGNMENT: "bg-rose-50 text-rose-700",
  CHECKED_IN: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700",
  COMPLETED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  NO_SHOW: "bg-rose-50 text-rose-700",
};

const STATUS_LABEL: Record<string, string> = {
  BOOKED: "Awaiting Payment",
  CONFIRMED: "Confirmed",
  RESCHEDULED: "Rescheduled",
  PENDING_REASSIGNMENT: "Action Needed",
  CHECKED_IN: "Checked In",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
};

const Appointments = () => {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [items, setItems] = useState<PatientAppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listMyAppointments(tab);
      setItems(r.data.data);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Failed to load appointments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const cancel = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    try {
      await cancelAppointment(id);
      toast.success("Appointment cancelled");
      load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Cancel failed"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={24} className="text-blue-600" />
            My Appointments
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track upcoming visits, manage rescheduling and review past
            consultations.
          </p>
        </div>
        <Link
          to="/patient/hospitals"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm"
        >
          Book New Appointment
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex border-b border-slate-100 px-2">
          {(
            [
              { id: "upcoming", label: "Upcoming" },
              { id: "completed", label: "Completed" },
              { id: "cancelled", label: "Cancelled" },
            ] as Array<{ id: Tab; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
                tab === t.id
                  ? "text-blue-600 border-blue-600"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-slate-100 animate-pulse"
              />
            ))
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Calendar
                className="mx-auto text-slate-300 mb-2"
                size={48}
              />
              <p className="text-slate-500">No appointments here.</p>
            </div>
          ) : (
            items.map((a) => {
              const isPending = a.status === "PENDING_REASSIGNMENT";
              const isBooked = a.status === "BOOKED";
              const canCancel = [
                "BOOKED",
                "CONFIRMED",
                "RESCHEDULED",
                "PENDING_REASSIGNMENT",
              ].includes(a.status);
              return (
                <div
                  key={a.id}
                  className={`border rounded-xl p-4 transition ${
                    isPending
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {a.provider_photo ? (
                      <img
                        src={a.provider_photo}
                        alt={a.provider_name}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-lg flex-shrink-0">
                        {a.provider_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {a.provider_name}
                          </div>
                          <div className="text-blue-600 text-sm">
                            {a.provider_specialty}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            STATUS_BADGE[a.status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {STATUS_LABEL[a.status] || a.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} />
                          {fmt(a.scheduled_at)}
                        </span>
                        {a.type === "VIDEO" && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700">
                            <Video size={14} /> Video consultation
                          </span>
                        )}
                        {a.facility_name && (
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 size={14} />
                            {a.facility_name}
                          </span>
                        )}
                        {a.consultation_fee != null && (
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            ₹{Number(a.consultation_fee).toFixed(0)}{" "}
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                a.payment_status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : a.payment_status === "REFUNDED"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {a.payment_status}
                            </span>
                          </span>
                        )}
                      </div>

                      {isPending && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-rose-700">
                          <AlertTriangle
                            size={16}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <span>
                            The doctor is no longer available for this slot.
                            Please pick an alternative.
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        {a.meeting_link &&
                          !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(
                            a.status
                          ) && (
                            <a
                              href={a.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                            >
                              <Video size={14} /> Join Video Visit
                            </a>
                          )}
                        {isBooked && (
                          <Link
                            to={`/patient/appointments/${a.id}/review`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                          >
                            <Hourglass size={14} /> Complete Payment
                          </Link>
                        )}
                        {isPending && (
                          <Link
                            to={`/patient/appointments/${a.id}/alternatives`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                          >
                            <RefreshCw size={14} /> Choose Alternative
                          </Link>
                        )}
                        {a.status === "CONFIRMED" && (
                          <Link
                            to={`/patient/appointments/${a.id}/alternatives`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700"
                          >
                            <RefreshCw size={14} /> Reschedule
                          </Link>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => cancel(a.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600"
                          >
                            <XCircle size={14} /> Cancel
                          </button>
                        )}
                        {a.status === "COMPLETED" && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            Visit completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Appointments;
