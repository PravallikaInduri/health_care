import { useEffect, useState } from "react";
import {
  Layers,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Info,
  Building2,
} from "lucide-react";
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listFacilities,
  listDepartmentFacilities,
  attachDepartmentToFacility,
  detachDepartmentFromFacility,
  type AdminDepartment,
  type AdminFacility,
} from "../../api/admin.api";
import toast from "react-hot-toast";

interface FormState {
  id?: string;
  name: string;
  description: string;
  icon: string;
  slug: string;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  icon: "",
  slug: "",
};

const Departments = () => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [data, setData] = useState<AdminDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  /* Hospital attachment state for the modal */
  const [hospitals, setHospitals] = useState<AdminFacility[]>([]);
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<
    Set<string>
  >(new Set());
  const [initialHospitalIds, setInitialHospitalIds] = useState<
    Set<string>
  >(new Set());
  const [hospitalsLoading, setHospitalsLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listDepartments(debounced || undefined);
      setData(res.data.data);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Failed to load departments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debounced]);

  /* Load the full hospital list once — used by the create/edit modal's
     "Available at hospitals" picker. */
  const ensureHospitalsLoaded = async () => {
    if (hospitals.length > 0) return;
    setHospitalsLoading(true);
    try {
      const res = await listFacilities({
        type: "HOSPITAL",
        limit: 100,
      });
      setHospitals(res.data.data);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Failed to load hospitals"
      );
    } finally {
      setHospitalsLoading(false);
    }
  };

  const openCreate = async () => {
    setForm(emptyForm);
    setSelectedHospitalIds(new Set());
    setInitialHospitalIds(new Set());
    setOpen(true);
    void ensureHospitalsLoaded();
  };

  const openEdit = async (d: AdminDepartment) => {
    setForm({
      id: d.id,
      name: d.name || "",
      description: d.description || "",
      icon: d.icon || "",
      slug: d.slug || "",
    });
    setOpen(true);
    void ensureHospitalsLoaded();
    try {
      const res = await listDepartmentFacilities(d.id);
      const ids = new Set(res.data.data.map((f) => f.id));
      setSelectedHospitalIds(ids);
      setInitialHospitalIds(ids);
    } catch {
      setSelectedHospitalIds(new Set());
      setInitialHospitalIds(new Set());
    }
  };

  const toggleHospital = (id: string) => {
    setSelectedHospitalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* Diff selected vs original hospital ids and run attach/detach calls so
     the facility_departments table matches the new selection. */
  const syncHospitalAttachments = async (departmentId: string) => {
    const toAttach = [...selectedHospitalIds].filter(
      (id) => !initialHospitalIds.has(id)
    );
    const toDetach = [...initialHospitalIds].filter(
      (id) => !selectedHospitalIds.has(id)
    );

    const errors: string[] = [];
    for (const fid of toAttach) {
      try {
        await attachDepartmentToFacility(fid, departmentId);
      } catch (e: any) {
        errors.push(
          e?.response?.data?.message ||
            `Failed to attach to ${fid}`
        );
      }
    }
    for (const fid of toDetach) {
      try {
        await detachDepartmentFromFacility(fid, departmentId);
      } catch (e: any) {
        errors.push(
          e?.response?.data?.message ||
            `Failed to detach from ${fid}`
        );
      }
    }
    if (errors.length > 0) {
      toast.error(errors[0]);
    }
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      setSaving(true);
      let departmentId = form.id;
      if (form.id) {
        await updateDepartment(form.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          icon: form.icon.trim() || null,
          slug: form.slug.trim() || undefined,
        });
      } else {
        const res = await createDepartment({
          name: form.name.trim(),
          description: form.description.trim() || null,
          icon: form.icon.trim() || null,
          slug: form.slug.trim() || undefined,
        });
        departmentId = res.data.data.id;
      }

      if (departmentId) {
        await syncHospitalAttachments(departmentId);
      }

      toast.success(form.id ? "Department updated" : "Department created");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: AdminDepartment) => {
    if (
      !confirm(
        `Delete department "${d.name}"? This will also remove its hospital and doctor assignments.`
      )
    )
      return;
    try {
      await deleteDepartment(d.id);
      toast.success("Department deleted");
      load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Delete failed"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers size={24} className="text-blue-600" />
            Department Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Master list of clinical departments. Used across hospitals and
            doctor profiles.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
        >
          <Plus size={18} /> Add Department
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-slate-700">
        <Info
          size={18}
          className="text-blue-600 shrink-0 mt-0.5"
        />
        <div>
          <p className="font-medium text-blue-900">
            How departments appear on the patient portal
          </p>
          <p className="mt-0.5 text-slate-600">
            Creating a department here only adds it to the master catalog.
            To make it appear on a hospital's profile (and bump that
            hospital's department count for patients), tick the hospitals
            in the "Available at hospitals" picker inside the Add/Edit
            dialog. You can also manage attachments per hospital from{" "}
            <span className="font-medium">Facilities → [hospital] →
              Departments</span>
            .
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-sm">
          <Search
            size={18}
            className="absolute top-3 left-3 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            Loading…
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center">
            <Layers
              className="mx-auto text-slate-300 mb-2"
              size={48}
            />
            <p className="text-slate-500">No departments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    Slug
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    Icon
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    Description
                  </th>
                  <th className="text-center px-4 py-3 font-semibold">
                    Hospitals
                  </th>
                  <th className="text-center px-4 py-3 font-semibold">
                    Doctors
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {d.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <code className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                        {d.slug || "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {d.icon || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-md">
                      <div className="line-clamp-1">
                        {d.description || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {d.facility_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {d.provider_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEdit(d)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => remove(d)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-slate-900">
                {form.id ? "Edit Department" : "Add Department"}
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
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. Cardiology"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Slug
                  <span className="text-slate-400 text-xs ml-1">
                    (auto-derived from name if blank)
                  </span>
                </label>
                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm({ ...form, slug: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="cardiology"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Icon
                  <span className="text-slate-400 text-xs ml-1">
                    (Lucide icon name, e.g. Heart, Brain)
                  </span>
                </label>
                <input
                  value={form.icon}
                  onChange={(e) =>
                    setForm({ ...form, icon: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Heart"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 size={14} className="text-blue-600" />
                  Available at hospitals
                  <span className="text-slate-400 text-xs ml-1 font-normal">
                    (tick the hospitals where this department is offered)
                  </span>
                </label>
                <div className="rounded-lg border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {hospitalsLoading ? (
                    <div className="p-4 text-sm text-slate-500 text-center">
                      Loading hospitals…
                    </div>
                  ) : hospitals.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 text-center">
                      No hospitals found. Create one under Facilities first.
                    </div>
                  ) : (
                    hospitals.map((h) => {
                      const checked = selectedHospitalIds.has(h.id);
                      return (
                        <label
                          key={h.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleHospital(h.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-300"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {h.name}
                            </p>
                            {h.address && (
                              <p className="text-xs text-slate-500 truncate">
                                {h.address}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
                {selectedHospitalIds.size > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedHospitalIds.size} hospital
                    {selectedHospitalIds.size === 1 ? "" : "s"} selected
                  </p>
                )}
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
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60"
              >
                {saving ? "Saving…" : form.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
