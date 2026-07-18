import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Video, MapPin, CalendarX } from "lucide-react";
import {
  getBookableProviders,
  getProviderFacilities,
  getAvailability,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
} from "../../api/patient.api";
import { formatDoctorName } from "../../utils/doctorName";

interface Provider {
  id: string;
  name: string;
  specialty: string | null;
  photo_url: string | null;
}

interface Facility {
  id: string;
  name: string;
  type: string;
}

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  type: string;
  reason: string | null;
  doctor_name: string;
}

/* Local-date YYYY-MM-DD. We deliberately avoid toISOString() because it
   converts to UTC first, which for users east of UTC (e.g. IST) returns
   yesterday's date for most of the day. */
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const BookAppointment = () => {
  const [providers, setProviders] = useState<Provider[]>(
    []
  );
  const [facilities, setFacilities] = useState<Facility[]>(
    []
  );
  const [slots, setSlots] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<
    Appointment[]
  >([]);

  const [form, setForm] = useState({
    provider_id: "",
    facility_id: "",
    date: todayStr(),
    slot: "",
    type: "IN_PERSON" as "IN_PERSON" | "VIDEO",
    reason: "",
  });

  const [loadingSlots, setLoadingSlots] =
    useState(false);
  const [booking, setBooking] = useState(false);

  const loadAppointments = async () => {
    try {
      const res = await getMyAppointments();
      setAppointments(res.data.data ?? []);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getBookableProviders();
        setProviders(res.data.data ?? []);
      } catch {
        toast.error("Failed to load doctors");
      }
    };
    load();
    loadAppointments();
  }, []);

  /* Load facilities when provider changes */
  useEffect(() => {
    if (!form.provider_id) {
      setFacilities([]);
      return;
    }

    const load = async () => {
      try {
        const res = await getProviderFacilities(
          form.provider_id
        );
        setFacilities(res.data.data ?? []);
      } catch {
        toast.error("Failed to load facilities");
      }
    };
    load();
  }, [form.provider_id]);

  /* Load slots when provider + date set */
  useEffect(() => {
    if (!form.provider_id || !form.date) {
      setSlots([]);
      return;
    }

    const load = async () => {
      try {
        setLoadingSlots(true);
        setSlots([]);
        const res = await getAvailability(
          form.provider_id,
          form.date
        );
        setSlots(res.data.slots ?? []);
      } catch (error: any) {
        setSlots([]);
        toast.error(
          error?.response?.data?.message ??
            "No availability found"
        );
      } finally {
        setLoadingSlots(false);
      }
    };
    load();
  }, [form.provider_id, form.date]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.provider_id ||
      !form.facility_id ||
      !form.slot
    ) {
      toast.error(
        "Select doctor, facility and a time slot"
      );
      return;
    }

    try {
      setBooking(true);

      await bookAppointment({
        provider_id: form.provider_id,
        facility_id: form.facility_id,
        scheduled_at: `${form.date}T${form.slot}:00`,
        type: form.type,
        reason: form.reason,
      });

      toast.success("Appointment booked!");

      setForm((f) => ({
        ...f,
        slot: "",
        reason: "",
      }));

      const res = await getAvailability(
        form.provider_id,
        form.date
      );
      setSlots(res.data.slots ?? []);

      loadAppointments();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          "Failed to book appointment"
      );
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelAppointment(id);
      toast.success("Appointment cancelled");
      loadAppointments();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">
        Book an Appointment
      </h1>

      <form
        onSubmit={handleBook}
        className="bg-white rounded-3xl shadow-md p-6 grid md:grid-cols-2 gap-6"
      >
        <div>
          <label className="block mb-2 text-sm font-medium text-slate-600">
            Doctor
          </label>
          <select
            value={form.provider_id}
            onChange={(e) =>
              setForm({
                ...form,
                provider_id: e.target.value,
                facility_id: "",
                slot: "",
              })
            }
            disabled={providers.length === 0}
            className="w-full p-3 rounded-xl border disabled:bg-slate-100"
          >
            <option value="">
              {providers.length === 0
                ? "No doctors available right now"
                : "Select a doctor…"}
            </option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {formatDoctorName(p.name)}
                {p.specialty
                  ? ` — ${p.specialty}`
                  : ""}
              </option>
            ))}
          </select>
          {providers.length === 0 && (
            <p className="mt-2 text-xs text-rose-500">
              No doctors are currently associated with any
              facility. Please check back later.
            </p>
          )}
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-slate-600">
            Facility
          </label>
          <select
            value={form.facility_id}
            onChange={(e) =>
              setForm({
                ...form,
                facility_id: e.target.value,
              })
            }
            disabled={
              !form.provider_id || facilities.length === 0
            }
            className="w-full p-3 rounded-xl border disabled:bg-slate-100"
          >
            <option value="">
              {!form.provider_id
                ? "Pick a doctor first…"
                : facilities.length === 0
                  ? "No facilities assigned to this doctor"
                  : "Select a facility…"}
            </option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.type})
              </option>
            ))}
          </select>
          {form.provider_id && facilities.length === 0 && (
            <p className="mt-2 text-xs text-rose-500">
              This doctor has no facilities assigned yet. Please
              choose a different doctor or contact the clinic.
            </p>
          )}
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-slate-600">
            Date
          </label>
          <input
            type="date"
            min={todayStr()}
            value={form.date}
            onChange={(e) =>
              setForm({
                ...form,
                date: e.target.value,
                slot: "",
              })
            }
            className="w-full p-3 rounded-xl border"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-slate-600">
            Appointment Type
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  type: "IN_PERSON",
                })
              }
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition ${
                form.type === "IN_PERSON"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white"
              }`}
            >
              <MapPin size={18} /> In-person
            </button>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  type: "VIDEO",
                })
              }
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition ${
                form.type === "VIDEO"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white"
              }`}
            >
              <Video size={18} /> Video
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block mb-2 text-sm font-medium text-slate-600">
            Available Slots
          </label>

          {loadingSlots ? (
            <p className="text-slate-400">
              Loading slots…
            </p>
          ) : !form.provider_id ? (
            <p className="text-slate-400">
              Select a doctor and date to see slots.
            </p>
          ) : slots.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-400">
              <CalendarX size={18} />
              No available slots for this date.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setForm({ ...form, slot: s })
                  }
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                    form.slot === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white hover:bg-slate-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block mb-2 text-sm font-medium text-slate-600">
            Reason (optional)
          </label>
          <textarea
            value={form.reason}
            onChange={(e) =>
              setForm({
                ...form,
                reason: e.target.value,
              })
            }
            rows={2}
            className="w-full p-3 rounded-xl border"
            placeholder="Describe your symptoms or reason for visit"
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={booking}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {booking ? "Booking…" : "Book Appointment"}
          </button>
        </div>
      </form>

      {/* My appointments */}
      <div className="bg-white rounded-3xl shadow-md p-6">
        <h3 className="font-semibold text-lg mb-4">
          My Appointments
        </h3>

        {appointments.length === 0 ? (
          <p className="text-slate-400">
            You have no appointments yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {appointments.map((a) => (
              <li
                key={a.id}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">
                    {formatDoctorName(a.doctor_name)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(
                      a.scheduled_at
                    ).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {a.type}
                  </p>
                  {a.reason && (
                    <p className="text-sm text-slate-400">
                      {a.reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      a.status === "CANCELLED"
                        ? "bg-red-100 text-red-700"
                        : a.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {a.status}
                  </span>

                  {a.status !== "CANCELLED" &&
                    a.status !== "COMPLETED" && (
                      <button
                        onClick={() =>
                          handleCancel(a.id)
                        }
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BookAppointment;
