import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Video, MapPin, Link as LinkIcon } from "lucide-react";
import {
  getDoctorAppointments,
  updateAppointmentStatus,
} from "../../api/doctor.api";
import type {
  DoctorAppointment,
  AppointmentStatus,
} from "../../types/doctor";

const STATUS_FLOW: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  BOOKED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_PROGRESS", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const statusColor = (status: AppointmentStatus) => {
  switch (status) {
    case "BOOKED":
      return "bg-sky-100 text-sky-700";
    case "CONFIRMED":
      return "bg-blue-100 text-blue-700";
    case "CHECKED_IN":
      return "bg-indigo-100 text-indigo-700";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700";
    case "COMPLETED":
      return "bg-green-100 text-green-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "NO_SHOW":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const FILTERS = [
  "ALL",
  "REQUESTED",
  "BOOKED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

const Appointments = () => {
  const [appointments, setAppointments] = useState<
    DoctorAppointment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]>("ALL");
  const [updatingId, setUpdatingId] = useState<
    string | null
  >(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDoctorAppointments();
      setAppointments(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Failed to load appointments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatus = async (
    id: string,
    status: AppointmentStatus
  ) => {
    try {
      setUpdatingId(id);
      await updateAppointmentStatus(id, status);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status } : a
        )
      );
      toast.success(`Marked as ${status}`);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ??
          "Failed to update status"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "ALL") return appointments;
    return appointments.filter(
      (a) => a.status === filter
    );
  }, [appointments, filter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 rounded-2xl p-6">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Appointments</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-md p-10 text-center text-slate-400">
          No appointments found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => {
            const nextStatuses =
              STATUS_FLOW[a.status] ?? [];

            return (
              <div
                key={a.id}
                className="bg-white rounded-3xl shadow-md p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {a.first_name} {a.last_name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(
                          a.status
                        )}`}
                      >
                        {a.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-500 mt-1">
                      {a.reason || "Consultation"}
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                      <span>
                        {new Date(
                          a.scheduled_at
                        ).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>

                      <span className="flex items-center gap-1">
                        {a.type === "VIDEO" ? (
                          <Video size={16} />
                        ) : (
                          <MapPin size={16} />
                        )}
                        {a.type === "VIDEO"
                          ? "VIDEO"
                          : "IN_PERSON"}
                      </span>

                      {a.meeting_link && (
                        <a
                          href={a.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-600"
                        >
                          <LinkIcon size={16} />
                          Join
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.length === 0 ? (
                      <span className="text-sm text-slate-400">
                        No actions
                      </span>
                    ) : (
                      nextStatuses.map((s) => (
                        <button
                          key={s}
                          disabled={
                            updatingId === a.id
                          }
                          onClick={() =>
                            handleStatus(a.id, s)
                          }
                          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-blue-600 hover:text-white transition disabled:opacity-50"
                        >
                          {s.replace("_", " ")}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Appointments;
