import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Building2,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import {
  getAvailability,
  draftAppointment,
  getDoctorProfile,
  getHospitalById,
  type DoctorPublicProfile,
  type HospitalCardData,
} from "../../api/booking.api";
import SlotGrid from "../../components/patient/booking/SlotGrid";
import toast from "react-hot-toast";

/* Local-date YYYY-MM-DD. We deliberately avoid toISOString() because it
   converts to UTC first, which for users east of UTC (e.g. IST) returns
   yesterday's date for most of the day. */
const todayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const BookSlot = () => {
  const { id = "", providerId = "" } = useParams();
  const navigate = useNavigate();

  const [date, setDate] = useState<string>(todayIso());
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<DoctorPublicProfile | null>(null);
  const [hospital, setHospital] = useState<HospitalCardData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [duration, setDuration] = useState<number>(30);
  const [reason, setReason] = useState("");
  const [type, setType] = useState<"IN_PERSON" | "VIDEO">("IN_PERSON");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    Promise.allSettled([getDoctorProfile(providerId), getHospitalById(id)])
      .then(([doctorRes, hospitalRes]) => {
        if (cancelled) return;
        if (doctorRes.status === "fulfilled") {
          setDoctor(doctorRes.value.data.data);
        } else {
          setDoctor(null);
        }
        if (hospitalRes.status === "fulfilled") {
          setHospital(hospitalRes.value.data.data);
        } else {
          setHospital(null);
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [providerId, id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected(null);
    getAvailability(providerId, id, date)
      .then((res) => {
        if (cancelled) return;
        setSlots(res.data.slots || []);
        setDuration(res.data.duration || 30);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(
          e?.response?.data?.message || "Failed to fetch slots"
        );
        setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [providerId, id, date]);

  const minDate = useMemo(() => todayIso(), []);

  /* When booking for today, hide slots whose time has already passed so the
     patient only sees times from "now" onwards. */
  const visibleSlots = useMemo(() => {
    if (date !== todayIso()) return slots;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slots.filter((s) => {
      const [h, m] = s.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return true;
      return h * 60 + m > nowMinutes;
    });
  }, [slots, date]);

  const activeFee = useMemo(() => {
    const inPerson = Number(doctor?.consultation_fee ?? 0);
    if (type === "VIDEO") {
      const video = doctor?.video_consultation_fee;
      return video == null ? inPerson : Number(video);
    }
    return inPerson;
  }, [doctor, type]);

  const proceed = async () => {
    if (!selected) {
      toast.error("Please select a time slot");
      return;
    }
    try {
      setSubmitting(true);
      const res = await draftAppointment({
        provider_id: providerId,
        facility_id: id,
        scheduled_at: `${date}T${selected}:00`,
        duration_min: duration,
        type,
        reason: reason.trim() || undefined,
      });
      navigate(`/patient/appointments/${res.data.appointmentId}/review`);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Could not start booking"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to={`/patient/hospitals/${id}/doctors/${providerId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600"
      >
        <ArrowLeft size={16} /> Back to doctor profile
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">
        Pick a time
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 lg:sticky lg:top-4 self-start">
          {doctor ? (
            <div className="flex items-center gap-3">
              {doctor.photo_url ? (
                <img
                  src={doctor.photo_url}
                  alt={doctor.name}
                  className="w-14 h-14 rounded-xl object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold">
                  {doctor.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-semibold text-slate-900">
                  {doctor.name}
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  {doctor.specialty}
                </div>
              </div>
            </div>
          ) : profileLoading ? (
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <div className="font-semibold text-slate-900">
                Doctor details unavailable
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                You can still pick an available time slot.
              </div>
            </div>
          )}

          {hospital ? (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <Building2
                size={16}
                className="mt-0.5 text-blue-500 flex-shrink-0"
              />
              <div>
                <div className="font-medium text-slate-800">
                  {hospital.name}
                </div>
                <div className="text-xs text-slate-500">
                  {hospital.address}
                </div>
              </div>
            </div>
          ) : !profileLoading ? (
            <div className="flex items-start gap-2 text-sm text-slate-500">
              <Building2
                size={16}
                className="mt-0.5 text-blue-500 flex-shrink-0"
              />
              Hospital details unavailable
            </div>
          ) : null}

          <div className="pt-3 border-t border-slate-100 text-sm space-y-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Stethoscope size={14} /> Duration: {duration} mins
            </div>
            {doctor?.consultation_fee != null && (
              <div className="flex items-center justify-between font-semibold pt-1 text-slate-900">
                <span>
                  {type === "VIDEO"
                    ? "Video Consultation Fee"
                    : "In-person Consultation Fee"}
                </span>
                <span>₹{activeFee.toFixed(0)}</span>
              </div>
            )}
          </div>
        </aside>

        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-500" />{" "}
              Select Date
            </h3>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-3">
              Available Slots
            </h3>
            <SlotGrid
              slots={visibleSlots}
              selected={selected}
              onSelect={setSelected}
              loading={loading}
            />
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-3">
              Visit Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Visit Type
                </label>
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as "IN_PERSON" | "VIDEO")
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="IN_PERSON">In-Person</option>
                  <option value="VIDEO">Video Consultation</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason for visit (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Briefly describe your concern…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={proceed}
              disabled={!selected || submitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow disabled:opacity-50 transition"
            >
              {submitting ? "Holding slot…" : "Review & Pay"}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookSlot;
