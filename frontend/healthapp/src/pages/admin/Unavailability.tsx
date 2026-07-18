import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarOff,
  ChevronRight,
  Plus,
  X,
  Stethoscope,
  Users,
  Mail,
} from "lucide-react";
import {
  listUnavailabilities,
  listAffectedAppointmentsAdmin,
  markProviderUnavailable,
  listDoctors as adminListDoctors,
  type UnavailabilityRow,
  type AffectedAppointment,
} from "../../api/admin.api";
import toast from "react-hot-toast";

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

interface FormState {
  provider_id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string;
}

const emptyForm: FormState = {
  provider_id: "",
  start_datetime: "",
  end_datetime: "",
  reason: "",
};

const Unavailability = () => {
  const [items, setItems] = useState<UnavailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [doctors, setDoctors] = useState<
    Array<{ id: string; name: string; specialty: string | null }>
  >([]);
  const [submitting, setSubmitting] = useState(false);

  /* Affected drawer */
  const [drawerOverrideId, setDrawerOverrideId] = useState<string | null>(
    null
  );
  const [affected, setAffected] = useState<AffectedAppointment[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listUnavailabilities();
      setItems(r.data.data);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Failed to load unavailabilities"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = async () => {
    try {
      const r = await adminListDoctors({
        page: 1,
        limit: 100,
        status: "APPROVED",
      });
      setDoctors(r.data.data || []);
      setForm(emptyForm);
      setOpen(true);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Failed to fetch doctors"
      );
    }
  };

  const submit = async () => {
    if (!form.provider_id) {
      toast.error("Pick a doctor");
      return;
    }
    if (!form.start_datetime || !form.end_datetime) {
      toast.error("Start and end times are required");
      return;
    }
    try {
      setSubmitting(true);
      const r = await markProviderUnavailable(form.provider_id, {
        start_datetime: form.start_datetime,
        end_datetime: form.end_datetime,
        reason: form.reason.trim() || null,
      });
      toast.success(
        `Unavailability recorded — ${r.data.affectedCount} appointment(s) need re-assignment`
      );
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const openAffected = async (overrideId: string) => {
    setDrawerOverrideId(overrideId);
    setDrawerLoading(true);
    try {
      const r = await listAffectedAppointmentsAdmin(overrideId);
      setAffected(r.data.data);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Failed to load affected"
      );
    } finally {
      setDrawerLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarOff size={24} className="text-rose-600" />
            Doctor Unavailability
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Mark a doctor unavailable for a window. Affected appointments are
            flipped to <em>Pending Reassignment</em>; patients are emailed and
            notified in-app to pick an alternative.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm"
        >
          <Plus size={18} /> Mark Unavailable
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarOff
              className="mx-auto text-slate-300 mb-2"
              size={48}
            />
            <p className="text-slate-500">No unavailability windows.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">
                    Doctor
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    Window
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    Reason
                  </th>
                  <th className="text-center px-4 py-3 font-semibold">
                    Affected
                  </th>
                  <th className="text-center px-4 py-3 font-semibold">
                    Pending
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {u.provider_name}
                      </div>
                      <div className="text-xs text-blue-600">
                        {u.specialty}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">
                        {fmt(u.start_datetime)}
                      </div>
                      <div className="text-xs text-slate-500">
                        → {fmt(u.end_datetime)}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="line-clamp-2 text-slate-600">
                        {u.reason || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {u.total_affected}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.pending_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-rose-50 text-rose-700">
                          <AlertTriangle size={12} />
                          {u.pending_count}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openAffected(u.id)}
                        className="inline-flex items-center gap-1 text-blue-600 text-xs font-semibold hover:underline"
                      >
                        View affected
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mark Unavailable modal */}
      {open && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <CalendarOff size={18} className="text-rose-600" />
                Mark Doctor Unavailable
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Doctor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.provider_id}
                  onChange={(e) =>
                    setForm({ ...form, provider_id: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <option value="">Select a doctor…</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.specialty ? ` — ${d.specialty}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start_datetime}
                    onChange={(e) =>
                      setForm({ ...form, start_datetime: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end_datetime}
                    onChange={(e) =>
                      setForm({ ...form, end_datetime: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason
                </label>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) =>
                    setForm({ ...form, reason: e.target.value })
                  }
                  placeholder="e.g. Personal leave, Conference travel…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  Patients with appointments in this window will be moved to
                  <strong> Pending Reassignment</strong>, emailed, and notified
                  in-app.
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-slate-50">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Confirm Unavailability"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Affected drawer */}
      {drawerOverrideId && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                Affected Appointments
              </h3>
              <button
                onClick={() => setDrawerOverrideId(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              {drawerLoading ? (
                <div className="text-slate-500">Loading…</div>
              ) : affected.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No appointments were affected.
                </div>
              ) : (
                <div className="space-y-3">
                  {affected.map((a) => (
                    <div
                      key={a.id}
                      className="border border-slate-200 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {[a.first_name, a.last_name]
                              .filter(Boolean)
                              .join(" ") || "Patient"}
                          </div>
                          <div className="text-xs text-slate-500 inline-flex items-center gap-1 mt-0.5">
                            <Mail size={12} />
                            {a.patient_email}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            a.status === "PENDING_REASSIGNMENT"
                              ? "bg-rose-50 text-rose-700"
                              : a.status === "RESCHEDULED"
                                ? "bg-sky-50 text-sky-700"
                                : a.status === "CANCELLED"
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                        <span>{fmt(a.scheduled_at)}</span>
                        {a.facility_name && (
                          <span className="inline-flex items-center gap-1">
                            <Stethoscope size={12} />
                            {a.facility_name}
                          </span>
                        )}
                        {a.consultation_fee != null && (
                          <span>
                            ₹{Number(a.consultation_fee).toFixed(0)} ·{" "}
                            <span
                              className={
                                a.payment_status === "PAID"
                                  ? "text-emerald-700 font-semibold"
                                  : a.payment_status === "REFUNDED"
                                    ? "text-slate-500"
                                    : "text-amber-700 font-semibold"
                              }
                            >
                              {a.payment_status}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Unavailability;
