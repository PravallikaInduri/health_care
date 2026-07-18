import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Pill,
  Plus,
  Pencil,
  Trash2,
  IndianRupee,
  Loader2,
  X,
} from "lucide-react";
import {
  getPharmacyMedicines,
  addPharmacyMedicine,
  updatePharmacyMedicine,
  deletePharmacyMedicine,
  type PharmacyMedicine,
} from "../../api/pharmacy.api";

const money = (n: number | string | null | undefined) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Medicines = () => {
  const [items, setItems] = useState<PharmacyMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PharmacyMedicine | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await getPharmacyMedicines();
      setItems(res.data.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load catalogue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setPrice("");
    setQuantity("");
    setModalOpen(true);
  };

  const openEdit = (m: PharmacyMedicine) => {
    setEditing(m);
    setName(m.medication_name || "");
    setPrice(String(m.price));
    setQuantity(String(m.quantity ?? 0));
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Enter a valid price");
      return;
    }
    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum < 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        await updatePharmacyMedicine(editing.id, {
          price: priceNum,
          quantity: qtyNum,
        });
        toast.success("Medicine updated");
      } else {
        if (!name.trim()) {
          toast.error("Enter a medicine name");
          setSaving(false);
          return;
        }
        await addPharmacyMedicine({
          name: name.trim(),
          price: priceNum,
          quantity: qtyNum,
        });
        toast.success("Medicine added to catalogue");
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: PharmacyMedicine) => {
    if (
      !window.confirm(
        `Remove "${m.medication_name}" from your catalogue?`
      )
    )
      return;
    try {
      await deletePharmacyMedicine(m.id);
      toast.success("Medicine removed");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Medicine Catalogue</h1>
          <p className="text-slate-500 mt-1">
            Add the medicines you stock with their quantity and price. Prices
            show on prescriptions and in patient billing.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
        >
          <Plus size={16} /> Add Medicine
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl shadow-sm p-10 text-center text-rose-500">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-10 text-center text-slate-400">
          <Pill className="mx-auto mb-3 text-slate-300" size={36} />
          No medicines yet. Add the medicines you stock with their quantity and
          price.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Medicine</th>
                <th className="px-5 py-3 font-medium">Quantity</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-700">
                      {m.medication_name}
                    </p>
                    {m.medication_generic && (
                      <p className="text-xs text-slate-400">
                        {m.medication_generic}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {m.quantity ?? 0} tablets
                  </td>
                  <td className="px-5 py-3 text-slate-700">{money(m.price)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(m)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-medium"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => remove(m)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-medium"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {editing ? "Edit Medicine" : "Add Medicine"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Medicine name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!!editing}
                  placeholder="e.g. Dolo 650"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Quantity (tablets)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Price (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium disabled:opacity-60"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editing ? "Save" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medicines;
