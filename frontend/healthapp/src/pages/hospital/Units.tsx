import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FlaskConical,
  Pill,
  Plus,
  X,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  getHospitalUnits,
  createHospitalUnit,
  updateHospitalUnit,
  deleteHospitalUnit,
  type HospitalUnit,
} from "../../api/hospital.api";

type FormState = {
  type: "LAB" | "PHARMACY";
  name: string;
  address: string;
  phone: string;
};

const emptyForm: FormState = {
  type: "LAB",
  name: "",
  address: "",
  phone: "",
};

const Units = () => {
  const [units, setUnits] = useState<HospitalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleting, setDeleting] = useState<HospitalUnit | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = async () => {
    try {
      const res = await getHospitalUnits();
      setUnits(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (u: HospitalUnit) => {
    setEditingId(u.id);
    setForm({
      type: u.type,
      name: u.name,
      address: u.address ?? "",
      phone: u.phone ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingId) {
        await updateHospitalUnit(editingId, {
          name: form.name,
          address: form.address,
          phone: form.phone,
        });
        toast.success("Unit updated");
      } else {
        await createHospitalUnit(form);
        toast.success(
          `${form.type === "LAB" ? "Lab" : "Pharmacy"} created`
        );
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
      setLoading(true);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save unit");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      setDeletingBusy(true);
      await deleteHospitalUnit(deleting.id);
      toast.success("Unit deleted");
      setDeleting(null);
      setLoading(true);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete unit");
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Labs & Pharmacies</h1>
          <p className="text-slate-500 mt-1">
            Your hospital's service units. Orders route to these.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium"
        >
          <Plus size={18} /> Add Unit
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : units.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-10 text-center text-slate-400">
          No units yet. Add a lab or pharmacy to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((u) => {
            const isLab = u.type === "LAB";
            const Icon = isLab ? FlaskConical : Pill;
            return (
              <div key={u.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isLab
                          ? "bg-cyan-100 text-cyan-600"
                          : "bg-emerald-100 text-emerald-600"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{u.name}</h3>
                      <span className="text-xs text-slate-400">
                        {isLab ? "Laboratory" : "Pharmacy"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(u)}
                      title="Edit"
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeleting(u)}
                      title="Delete"
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {u.address && (
                  <p className="text-sm text-slate-500 mt-3">{u.address}</p>
                )}
                <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-3">
                  <Users size={15} />
                  {u.staff_count} staff
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Unit" : "Add Unit"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(["LAB", "PHARMACY"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    disabled={!!editingId}
                    onClick={() => setForm({ ...form, type: t })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      form.type === t
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {t === "LAB" ? (
                      <FlaskConical size={18} />
                    ) : (
                      <Pill size={18} />
                    )}
                    {t === "LAB" ? "Lab" : "Pharmacy"}
                  </button>
                ))}
              </div>
              {editingId && (
                <p className="text-xs text-slate-400 -mt-2">
                  Unit type cannot be changed after creation.
                </p>
              )}

              <input
                required
                placeholder="Unit name (e.g. Apollo Central Lab)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400"
              />
              <input
                placeholder="Address (optional)"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400"
              />
              <input
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400"
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Save Changes"
                  : "Create Unit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold">Delete unit?</h2>
            <p className="text-slate-500 mt-2 text-sm">
              This will permanently delete{" "}
              <strong>{deleting.name}</strong>
              {deleting.staff_count > 0 && (
                <>
                  {" "}
                  and its <strong>{deleting.staff_count}</strong> staff
                  account(s)
                </>
              )}
              . Past orders linked to this unit will be detached but kept.
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

export default Units;
