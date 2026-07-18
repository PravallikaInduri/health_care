import { useEffect, useState } from "react";
import { Phone, UserPlus, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
  addEmergencyContact,
  getMyEmergencyContacts,
  type PatientEmergencyContact,
} from "../../api/patient.api";

const inputCls =
  "w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition";

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState<PatientEmergencyContact[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({ name: "", relationship: "", phone: "" });

  /* ── load list ── */
  const loadContacts = async () => {
    try {
      setListLoading(true);
      const res = await getMyEmergencyContacts();
      setContacts(res.data.data ?? []);
    } catch {
      /* silent */
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { loadContacts(); }, []);

  /* ── add ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone number are required");
      return;
    }
    try {
      setSaving(true);
      await addEmergencyContact(form);
      toast.success("Emergency contact added successfully");
      setForm({ name: "", relationship: "", phone: "" });
      setShowForm(false);
      await loadContacts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  /* Relationship badge colors */
  const relColor: Record<string, { bg: string; color: string }> = {
    Spouse:   { bg: "#FCE7F3", color: "#DB2777" },
    Parent:   { bg: "#EDE9FE", color: "#7C3AED" },
    Child:    { bg: "#D1FAE5", color: "#059669" },
    Sibling:  { bg: "#DBEAFE", color: "#1D4ED8" },
    Guardian: { bg: "#FEF3C7", color: "#D97706" },
  };
  const rel = (r: string | null) =>
    r ? relColor[r] ?? { bg: "#F1F5F9", color: "#64748B" } : { bg: "#F1F5F9", color: "#64748B" };

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* ── page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Emergency Contacts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trusted contacts to reach in an emergency
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)", boxShadow: "0 4px 12px rgba(239,68,68,0.25)" }}
        >
          <UserPlus size={14} />
          {showForm ? "Cancel" : "Add Contact"}
        </button>
      </div>

      {/* ── add form ── */}
      {showForm && (
        <div
          className="bg-white rounded-2xl p-5"
          style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
            >
              <UserPlus size={14} />
            </div>
            <p className="text-sm font-semibold text-slate-800">Add Emergency Contact</p>
          </div>

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="e.g. Suresh Kumar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Relationship
              </label>
              <select
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                className={inputCls}
              >
                <option value="">Select relationship</option>
                <option>Spouse</option>
                <option>Parent</option>
                <option>Child</option>
                <option>Sibling</option>
                <option>Guardian</option>
                <option>Friend</option>
                <option>Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}
              >
                {saving ? "Saving…" : "Add Contact"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── contacts list ── */}
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
      >
        <div
          className="flex items-center gap-2 px-5 py-3.5"
          style={{ borderBottom: "1px solid #F1F5F9" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
          >
            <Users size={14} />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Emergency Contacts
            {!listLoading && (
              <span className="ml-1.5 text-xs font-normal text-slate-400">
                ({contacts.length})
              </span>
            )}
          </p>
        </div>

        {listLoading ? (
          <div className="flex justify-center py-8">
            <div
              className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin"
              style={{ borderColor: "#FECACA", borderTopColor: "transparent" }}
            />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-10">
            <div
              className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: "#FEF2F2", color: "#FCA5A5" }}
            >
              <Phone size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-600">No emergency contacts available</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Contact" to register a trusted emergency contact.
            </p>
          </div>
        ) : (
          <>
            {/* table header */}
            <div
              className="grid grid-cols-12 gap-3 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}
            >
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Relationship</div>
              <div className="col-span-4">Phone Number</div>
              <div className="col-span-1 text-right">Call</div>
            </div>

            {/* rows */}
            <ul className="divide-y divide-slate-50">
              {contacts.map((c, idx) => {
                const badge = rel(c.relationship);
                return (
                  <li
                    key={c.id ?? idx}
                    className="grid grid-cols-12 gap-3 items-center px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* name */}
                    <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}
                      >
                        {c.name.trim().charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                    </div>

                    {/* relationship */}
                    <div className="col-span-3">
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                        style={badge}
                      >
                        {c.relationship || "—"}
                      </span>
                    </div>

                    {/* phone */}
                    <div className="col-span-4 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                      <Phone size={11} className="text-slate-400 flex-shrink-0" />
                      {c.phone}
                    </div>

                    {/* call button */}
                    <div className="col-span-1 flex justify-end">
                      <a
                        href={`tel:${c.phone}`}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition hover:opacity-80"
                        style={{ background: "linear-gradient(135deg,#22C55E,#16A34A)" }}
                        title={`Call ${c.name}`}
                      >
                        <Phone size={13} />
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* safety tip */}
      <div
        className="rounded-xl px-4 py-3 text-xs text-red-700"
        style={{ backgroundColor: "#FFF5F5", border: "1px solid #FED7D7" }}
      >
        <span className="font-semibold">Important: </span>
        Emergency contacts will be reached by healthcare staff if you are unable to communicate.
        Keep this information accurate and up to date.
      </div>
    </div>
  );
};

export default EmergencyContacts;
