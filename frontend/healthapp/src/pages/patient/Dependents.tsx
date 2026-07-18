import { useEffect, useState } from "react";
import { Users, UserPlus, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import {
  addDependent,
  getMyDependents,
  type PatientDependent,
} from "../../api/patient.api";

const inputCls =
  "w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition";

const Dependents = () => {
  const [dependents, setDependents] = useState<PatientDependent[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    dob: "",
    relationship: "",
    proxy_consent: false,
  });

  /* ── load list ── */
  const loadDependents = async () => {
    try {
      setListLoading(true);
      const res = await getMyDependents();
      setDependents(res.data.data ?? []);
    } catch {
      /* silent — list just stays empty */
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { loadDependents(); }, []);

  /* ── add ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.relationship.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      setSaving(true);
      await addDependent(form);
      toast.success("Dependent added successfully");
      setForm({ first_name: "", last_name: "", dob: "", relationship: "", proxy_consent: false });
      setShowForm(false);
      await loadDependents();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add dependent");
    } finally {
      setSaving(false);
    }
  };

  const fmtDob = (v?: string | null) =>
    v
      ? new Date(v).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* ── page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Dependents</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Family members registered under your account
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)", boxShadow: "0 4px 12px rgba(14,165,233,0.25)" }}
        >
          <UserPlus size={14} />
          {showForm ? "Cancel" : "Add Dependent"}
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
              style={{ backgroundColor: "#EFF6FF", color: "#0284C7" }}
            >
              <UserPlus size={14} />
            </div>
            <p className="text-sm font-semibold text-slate-800">Add New Dependent</p>
          </div>

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="e.g. Ramesh"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="e.g. Kumar"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={form.dob}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Relationship <span className="text-red-500">*</span>
              </label>
              <select
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                className={inputCls}
                required
              >
                <option value="">Select relationship</option>
                <option>Spouse</option>
                <option>Child</option>
                <option>Parent</option>
                <option>Sibling</option>
                <option>Guardian</option>
                <option>Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.proxy_consent}
                  onChange={(e) => setForm({ ...form, proxy_consent: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                  style={{ accentColor: "#0EA5E9" }}
                />
                <span className="text-sm text-slate-600">
                  I grant proxy consent to manage this dependent's healthcare records
                </span>
              </label>
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
                style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
              >
                {saving ? "Saving…" : "Add Dependent"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── dependents list ── */}
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
            style={{ backgroundColor: "#EFF6FF", color: "#0284C7" }}
          >
            <Users size={14} />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Registered Dependents
            {!listLoading && (
              <span className="ml-1.5 text-xs font-normal text-slate-400">
                ({dependents.length})
              </span>
            )}
          </p>
        </div>

        {listLoading ? (
          <div className="flex justify-center py-8">
            <div
              className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin"
              style={{ borderColor: "#BFDBFE", borderTopColor: "transparent" }}
            />
          </div>
        ) : dependents.length === 0 ? (
          <div className="text-center py-10">
            <div
              className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: "#F1F5F9", color: "#94A3B8" }}
            >
              <Users size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-600">No dependents added yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Dependent" to register a family member.
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
              <div className="col-span-3">Date of Birth</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            {/* rows */}
            <ul className="divide-y divide-slate-50">
              {dependents.map((dep) => (
                <li
                  key={dep.id}
                  className="grid grid-cols-12 gap-3 items-center px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                >
                  {/* name + avatar */}
                  <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
                    >
                      {dep.first_name.charAt(0).toUpperCase()}
                      {dep.last_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {dep.first_name} {dep.last_name}
                      </p>
                    </div>
                  </div>

                  {/* relationship */}
                  <div className="col-span-3">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: "#EFF6FF", color: "#0284C7" }}
                    >
                      {dep.relationship || "—"}
                    </span>
                  </div>

                  {/* dob */}
                  <div className="col-span-3 flex items-center gap-1.5 text-xs text-slate-600">
                    <CalendarDays size={12} className="text-slate-400 flex-shrink-0" />
                    {fmtDob(dep.dob)}
                  </div>

                  {/* status + actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#D1FAE5", color: "#059669" }}
                    >
                      {dep.proxy_consent ? "Proxy" : "Active"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default Dependents;
