import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  X,
  Users,
  FlaskConical,
  Pill,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  getHospitalStaff,
  getHospitalUnits,
  createHospitalStaff,
  updateHospitalStaff,
  deleteHospitalStaff,
  type HospitalStaff,
  type HospitalUnit,
} from "../../api/hospital.api";

const Staff = () => {
  const [staff, setStaff] = useState<HospitalStaff[]>([]);
  const [units, setUnits] = useState<HospitalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HospitalStaff | null>(null);
  const [deleting, setDeleting] = useState<HospitalStaff | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [form, setForm] = useState({
    facility_id: "",
    name: "",
    email: "",
    password: "",
    is_active: true,
  });

  const load = async () => {
    const [s, u] = await Promise.allSettled([
      getHospitalStaff(),
      getHospitalUnits(),
    ]);
    if (s.status === "fulfilled") {
      setStaff(s.value.data.data);
    } else {
      console.error(s.reason);
      toast.error("Failed to load staff");
    }
    if (u.status === "fulfilled") {
      setUnits(u.value.data.data);
    } else {
      console.error(u.reason);
      toast.error("Failed to load lab/pharmacy units");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      facility_id: units[0]?.id ?? "",
      name: "",
      email: "",
      password: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (s: HospitalStaff) => {
    setEditing(s);
    setForm({
      facility_id: s.unit_id,
      name: s.display_name ?? "",
      email: s.email,
      password: "",
      is_active: s.is_active === 1,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.facility_id) {
      toast.error("Create a lab or pharmacy unit first");
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        await updateHospitalStaff(editing.id, {
          name: form.name,
          facility_id: form.facility_id,
          is_active: form.is_active,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success("Staff updated");
      } else {
        const res = await createHospitalStaff({
          facility_id: form.facility_id,
          name: form.name,
          email: form.email,
          password: form.password,
        });
        if (res.data?.data?.emailed === false) {
          toast.success(
            "Staff created — but the credentials email could not be sent."
          );
        } else {
          toast.success("Staff created — credentials emailed.");
        }
      }
      setShowModal(false);
      setEditing(null);
      setLoading(true);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save staff");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      setDeletingBusy(true);
      await deleteHospitalStaff(deleting.id);
      toast.success("Staff account deleted");
      setDeleting(null);
      setLoading(true);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete staff");
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Staff</h1>
          <p className="text-slate-500 mt-1">
            Lab technicians and pharmacists who operate your units.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium"
        >
          <Plus size={18} /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-10 text-center text-slate-400">
          No staff yet. Add a lab technician or pharmacist.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Unit</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium">
                    {s.display_name || "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{s.email}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {s.unit_type === "LAB" ? (
                        <FlaskConical size={13} />
                      ) : (
                        <Pill size={13} />
                      )}
                      {s.staff_role === "LAB_TECH"
                        ? "Lab Technician"
                        : "Pharmacist"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{s.unit_name}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        s.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {s.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        title="Edit"
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleting(s)}
                        title="Delete"
                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
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

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editing ? "Edit Staff" : "Add Staff"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {units.length === 0 ? (
              <div className="mt-5 text-center text-slate-500 py-6">
                <Users className="mx-auto mb-2 text-slate-300" size={32} />
                You need at least one lab or pharmacy unit before adding
                staff.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="text-sm text-slate-500">Unit</label>
                  <select
                    value={form.facility_id}
                    onChange={(e) =>
                      setForm({ ...form, facility_id: e.target.value })
                    }
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 bg-white"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} (
                        {u.type === "LAB" ? "Lab" : "Pharmacy"})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Role is set automatically from the unit type.
                  </p>
                </div>

                <input
                  required
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400"
                />
                <input
                  required
                  type="email"
                  placeholder="Login email"
                  value={form.email}
                  disabled={!!editing}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-400"
                />
                <input
                  required={!editing}
                  type="password"
                  placeholder={
                    editing
                      ? "New password (leave blank to keep)"
                      : "Temporary password (min 6 chars)"
                  }
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400"
                />

                {editing && (
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm({ ...form, is_active: e.target.checked })
                      }
                    />
                    Account active (can sign in)
                  </label>
                )}

                {!editing && (
                  <p className="text-xs text-slate-400">
                    The login credentials will be emailed to the staff member.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Save Changes"
                    : "Create Staff Account"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold">Delete staff account?</h2>
            <p className="text-slate-500 mt-2 text-sm">
              This permanently removes the account for{" "}
              <strong>{deleting.display_name || deleting.email}</strong> and
              revokes their portal access.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleting(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingBusy}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-60"
              >
                {deletingBusy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
