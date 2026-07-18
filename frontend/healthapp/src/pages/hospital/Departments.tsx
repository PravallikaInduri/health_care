import { type FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Stethoscope,
  Users,
  Eye,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  attachHospitalDepartment,
  createHospitalDepartment,
  deleteHospitalDepartment,
  detachHospitalDepartment,
  getHospitalDepartments,
  updateHospitalDepartment,
  type HospitalDepartment,
} from "../../api/hospital.api";

type DeptFormState = {
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
};

const emptyForm: DeptFormState = {
  name: "",
  description: "",
  status: "ACTIVE",
};

const statusBadge = (status: "ACTIVE" | "INACTIVE") =>
  status === "ACTIVE"
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : "bg-slate-100 text-slate-600 border-slate-200";

const Departments = () => {
  const [departments, setDepartments] = useState<HospitalDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HospitalDepartment | null>(null);
  const [selected, setSelected] = useState<HospitalDepartment | null>(null);
  const [form, setForm] = useState<DeptFormState>(emptyForm);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await getHospitalDepartments();
      setDepartments(res.data.data.departments);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
    );
  }, [departments, search]);

  const activeCount = departments.filter((d) => d.status === "ACTIVE").length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (dept: HospitalDepartment) => {
    setEditing(dept);
    setForm({
      name: dept.name,
      description: dept.description ?? "",
      status: dept.status,
    });
    setFormOpen(true);
  };

  const saveDepartment = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateHospitalDepartment(editing.id, form);
        toast.success("Department updated");
      } else {
        await createHospitalDepartment(form);
        toast.success("Department created");
      }
      setFormOpen(false);
      await fetchDepartments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (dept: HospitalDepartment) => {
    setBusyId(dept.id);
    try {
      if (dept.status === "ACTIVE") {
        await detachHospitalDepartment(dept.id);
        toast.success("Department disabled");
      } else {
        await attachHospitalDepartment(dept.id);
        toast.success("Department enabled");
      }
      await fetchDepartments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Unable to update status");
    } finally {
      setBusyId(null);
    }
  };

  const removeDepartment = async (dept: HospitalDepartment) => {
    const ok = window.confirm(`Delete ${dept.name}?`);
    if (!ok) return;

    setBusyId(dept.id);
    try {
      await deleteHospitalDepartment(dept.id);
      toast.success("Department deleted");
      if (selected?.id === dept.id) setSelected(null);
      await fetchDepartments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Unable to delete department");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Department Management
            </h1>
            <p className="text-blue-100 text-sm">
              Create, edit, enable, disable and monitor hospital departments.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-white font-medium">
            {activeCount} active / {departments.length} total
          </span>
          <button
            onClick={fetchDepartments}
            className="w-9 h-9 rounded-xl text-white hover:bg-white/20 flex items-center justify-center transition"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50 transition"
          >
            <Plus size={16} /> Add Department
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments by name, description, or status..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1.3fr] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100">
              {[
                "Department",
                "Description",
                "Doctors",
                "Patients",
                "Status",
                "Actions",
              ].map((h) => (
                <span
                  key={h}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {h}
                </span>
              ))}
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Building2 size={42} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium text-slate-500">
                  No departments found
                </p>
                <p className="text-sm mt-1">
                  Create a department or adjust your search.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map((dept) => (
                  <div
                    key={dept.id}
                    className="grid md:grid-cols-[2fr_2fr_1fr_1fr_1fr_1.3fr] gap-4 items-center px-5 py-4 hover:bg-slate-50/70 transition"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">
                        {dept.name}
                      </p>
                      <p className="text-xs text-slate-400 md:hidden">
                        {dept.status}
                      </p>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">
                      {dept.description || "No description added"}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <Stethoscope size={14} className="text-sky-500" />
                      {dept.doctor_count}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <Users size={14} className="text-violet-500" />
                      {dept.patient_count}
                    </span>
                    <span
                      className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(
                        dept.status
                      )}`}
                    >
                      {dept.status}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelected(dept)}
                        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center justify-center"
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(dept)}
                        className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 inline-flex items-center justify-center"
                        title="Edit department"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => toggleStatus(dept)}
                        disabled={busyId === dept.id}
                        className="px-2.5 h-8 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold disabled:opacity-60"
                      >
                        {busyId === dept.id
                          ? "..."
                          : dept.status === "ACTIVE"
                            ? "Disable"
                            : "Enable"}
                      </button>
                      <button
                        onClick={() => removeDepartment(dept)}
                        disabled={busyId === dept.id}
                        className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 inline-flex items-center justify-center disabled:opacity-60"
                        title="Delete department"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-fit">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Department Details
                  </p>
                  <h2 className="font-bold text-slate-800 mt-1">
                    {selected.name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 inline-flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                {selected.description || "No description added."}
              </p>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-xl bg-sky-50 p-3">
                  <p className="text-xs text-sky-600">Doctors</p>
                  <p className="text-xl font-bold text-slate-800">
                    {selected.doctor_count}
                  </p>
                </div>
                <div className="rounded-xl bg-violet-50 p-3">
                  <p className="text-xs text-violet-600">Patients</p>
                  <p className="text-xl font-bold text-slate-800">
                    {selected.patient_count}
                  </p>
                </div>
              </div>
              <span
                className={`mt-4 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(
                  selected.status
                )}`}
              >
                {selected.status}
              </span>
            </>
          ) : (
            <div className="text-center py-10">
              <Eye size={34} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">View Details</p>
              <p className="text-sm text-slate-400 mt-1">
                Select a department to see its live counts and status.
              </p>
            </div>
          )}
        </aside>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={saveDepartment}
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">
                {editing ? "Edit Department" : "Add Department"}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 inline-flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Department Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="Cardiology"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="Describe the department services..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as DeptFormState["status"],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving && <RefreshCw size={14} className="animate-spin" />}
                {editing ? "Save Changes" : "Create Department"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Departments;
