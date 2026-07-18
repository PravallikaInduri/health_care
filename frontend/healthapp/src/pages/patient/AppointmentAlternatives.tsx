import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  CalendarClock,
  Star,
  GraduationCap,
  XCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  getAlternatives,
  reassignAppointment,
  cancelAppointment,
  type AppointmentDetail,
  type AltSlot,
  type AlternativeDoctor,
} from "../../api/booking.api";
import toast from "react-hot-toast";
import { formatDoctorName } from "../../utils/doctorName";

const fmtSlot = (s: AltSlot) => {
  try {
    const d = new Date(s.scheduled_at);
    return d.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return s.scheduled_at;
  }
};

const groupByDate = (slots: AltSlot[]) => {
  const map = new Map<string, AltSlot[]>();
  slots.forEach((s) => {
    if (!map.has(s.date)) map.set(s.date, []);
    map.get(s.date)!.push(s);
  });
  return Array.from(map.entries());
};

const fmtDateLabel = (date: string) => {
  try {
    return new Date(date).toLocaleDateString([], {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return date;
  }
};

const AppointmentAlternatives = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [appt, setAppt] = useState<AppointmentDetail | null>(null);
  const [sameSlots, setSameSlots] = useState<AltSlot[]>([]);
  const [altDocs, setAltDocs] = useState<AlternativeDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* Selection state */
  const [chosenSlot, setChosenSlot] = useState<AltSlot | null>(null);
  const [chosenDocSlot, setChosenDocSlot] = useState<{
    docId: string;
    slot: AltSlot;
  } | null>(null);
  const [tab, setTab] = useState<"same" | "alt">("same");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAlternatives(id)
      .then((r) => {
        if (cancelled) return;
        setAppt(r.data.appointment);
        setSameSlots(r.data.sameDoctorSlots || []);
        setAltDocs(r.data.alternativeDoctors || []);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(
          e?.response?.data?.message || "Failed to load alternatives"
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const submitSameDoctor = async () => {
    if (!chosenSlot) return;
    try {
      setSubmitting(true);
      await reassignAppointment(id, {
        scheduled_at: chosenSlot.scheduled_at,
      });
      toast.success("Appointment rescheduled");
      navigate("/patient/appointments");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Reassign failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtherDoctor = async () => {
    if (!chosenDocSlot) return;
    try {
      setSubmitting(true);
      await reassignAppointment(id, {
        scheduled_at: chosenDocSlot.slot.scheduled_at,
        provider_id: chosenDocSlot.docId,
      });
      toast.success("Switched to alternative doctor");
      navigate("/patient/appointments");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Reassign failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAndRefund = async () => {
    if (
      !confirm("Cancel this appointment? Any payment will be refunded.")
    )
      return;
    try {
      await cancelAppointment(id, "Cancelled by patient");
      toast.success("Appointment cancelled");
      navigate("/patient/appointments");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Cancel failed"
      );
    }
  };

  if (loading || !appt) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="h-72 rounded-2xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  const isPending = appt.status === "PENDING_REASSIGNMENT";

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        to="/patient/appointments"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600"
      >
        <ArrowLeft size={16} /> Back to my appointments
      </Link>

      <div
        className={`rounded-2xl p-5 border ${
          isPending
            ? "bg-rose-50 border-rose-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={isPending ? "text-rose-600" : "text-amber-600"}
            size={22}
          />
          <div>
            <h2 className="font-semibold text-slate-900">
              {isPending
                ? `${formatDoctorName(appt.provider_name)} is unavailable`
                : "Reschedule your appointment"}
            </h2>
            <p className="text-sm text-slate-700 mt-1">
              Original appointment:{" "}
              <strong>
                {new Date(appt.scheduled_at).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>{" "}
              at <strong>{appt.facility_name}</strong>.
              {isPending &&
                " Please pick one of the options below or cancel for a refund."}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex border-b border-slate-100 px-2">
          <button
            onClick={() => setTab("same")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === "same"
                ? "text-blue-600 border-blue-600"
                : "text-slate-500 border-transparent hover:text-slate-800"
            }`}
          >
            Same doctor — different slot
          </button>
          <button
            onClick={() => setTab("alt")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === "alt"
                ? "text-blue-600 border-blue-600"
                : "text-slate-500 border-transparent hover:text-slate-800"
            }`}
          >
            Different doctor — same department
          </button>
        </div>

        <div className="p-5">
          {tab === "same" ? (
            sameSlots.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                No alternative slots in the next 7 days.
              </div>
            ) : (
              <div className="space-y-5">
                {groupByDate(sameSlots).map(([date, slots]) => (
                  <div key={date}>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      {fmtDateLabel(date)}
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {slots.map((s) => {
                        const sel =
                          chosenSlot?.scheduled_at === s.scheduled_at;
                        return (
                          <button
                            key={s.scheduled_at}
                            onClick={() => setChosenSlot(s)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                              sel
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700"
                            }`}
                          >
                            {new Date(s.scheduled_at).toLocaleTimeString(
                              [],
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    disabled={!chosenSlot || submitting}
                    onClick={submitSameDoctor}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Confirm New Slot
                  </button>
                </div>
              </div>
            )
          ) : altDocs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No other doctors available in the same department.
            </div>
          ) : (
            <div className="space-y-4">
              {altDocs.map((d) => (
                <div
                  key={d.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-blue-200"
                >
                  <div className="flex items-start gap-4 flex-wrap">
                    {d.photo_url ? (
                      <img
                        src={d.photo_url}
                        alt={d.name}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold">
                        {d.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900">
                        {d.name}
                      </div>
                      <div className="text-blue-600 text-sm">
                        {d.specialty}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mt-1.5">
                        {d.qualifications && (
                          <span className="inline-flex items-center gap-1">
                            <GraduationCap size={12} /> {d.qualifications}
                          </span>
                        )}
                        {d.experience_years != null && (
                          <span>{d.experience_years} yrs exp</span>
                        )}
                        {d.avg_rating != null && (
                          <span className="inline-flex items-center gap-1">
                            <Star
                              size={12}
                              className="text-amber-500 fill-amber-500"
                            />
                            {Number(d.avg_rating).toFixed(1)} ({d.review_count})
                          </span>
                        )}
                        {d.consultation_fee != null && (
                          <span className="font-semibold text-slate-800">
                            ₹{Number(d.consultation_fee).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {d.nextSlots.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No upcoming slots
                      </p>
                    ) : (
                      <>
                        <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                          <CalendarClock size={12} /> Earliest available
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {d.nextSlots.map((s) => {
                            const sel =
                              chosenDocSlot?.docId === d.id &&
                              chosenDocSlot?.slot.scheduled_at ===
                                s.scheduled_at;
                            return (
                              <button
                                key={s.scheduled_at}
                                onClick={() =>
                                  setChosenDocSlot({ docId: d.id, slot: s })
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                  sel
                                    ? "bg-blue-600 border-blue-600 text-white"
                                    : "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700"
                                }`}
                              >
                                {fmtSlot(s)}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  disabled={!chosenDocSlot || submitting}
                  onClick={submitOtherDoctor}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  Switch Doctor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <button
          onClick={cancelAndRefund}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-sm font-semibold"
        >
          <XCircle size={16} />
          Cancel & Refund
        </button>
      </div>
    </div>
  );
};

export default AppointmentAlternatives;
