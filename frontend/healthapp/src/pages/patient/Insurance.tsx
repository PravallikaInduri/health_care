import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getInsurance,
  addInsurance,
  updateInsurance,
  deleteInsurance,
  type PatientInsurance,
} from "../../api/patient.api";

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        dateStyle: "medium",
      } as any)
    : "—";

const isExpired = (validTo: string | null) => {
  if (!validTo) return false;
  return new Date(validTo) < new Date();
};

interface FormState {
  payer: string;
  member_id: string;
  group_no: string;
  valid_from: string;
  valid_to: string;
}

const emptyForm: FormState = {
  payer: "",
  member_id: "",
  group_no: "",
  valid_from: "",
  valid_to: "",
};

const Insurance = () => {
  const [items, setItems] = useState<PatientInsurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] =
    useState<PatientInsurance | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getInsurance()
      .then((res) => setItems(res.data.data || []))
      .catch(() => {
        toast.error("Failed to load insurance");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: PatientInsurance) => {
    setEditing(item);
    setForm({
      payer: item.payer ?? "",
      member_id: item.member_id ?? "",
      group_no: item.group_no ?? "",
      valid_from: item.valid_from
        ? item.valid_from.split("T")[0]
        : "",
      valid_to: item.valid_to
        ? item.valid_to.split("T")[0]
        : "",
    });
    setFormOpen(true);
  };

  const handleDelete = async (item: PatientInsurance) => {
    const ok = window.confirm(
      `Remove insurance from "${item.payer}"?`
    );
    if (!ok) return;
    try {
      await deleteInsurance(item.id);
      toast.success("Insurance removed");
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to remove insurance"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.payer.trim() || !form.member_id.trim()) {
      toast.error("Payer and member ID are required");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        payer: form.payer.trim(),
        member_id: form.member_id.trim(),
        group_no: form.group_no.trim() || null,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
      };
      if (editing) {
        await updateInsurance(editing.id, payload);
        toast.success("Insurance updated");
      } else {
        await addInsurance(payload);
        toast.success("Insurance added");
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to save insurance"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Insurance
          </h1>
          <p className="text-sm text-slate-500">
            Manage your insurance policies and coverage
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus size={16} /> Add Insurance
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400">
          Loading insurance…
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Shield size={28} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">
            No insurance on file
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Add your insurance details so providers can verify
            coverage.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-5 inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} /> Add Insurance
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((ins) => {
            const expired = isExpired(ins.valid_to);
            return (
              <div
                key={ins.id}
                className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center shrink-0">
                      <Shield size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {ins.payer || "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Member ID: {ins.member_id || "—"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ring-1 ${
                      expired
                        ? "bg-rose-50 text-rose-700 ring-rose-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    }`}
                  >
                    {expired ? "Expired" : "Active"}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-400">
                      Group No.
                    </dt>
                    <dd className="text-slate-700 font-medium">
                      {ins.group_no || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      Effective
                    </dt>
                    <dd className="text-slate-700 font-medium">
                      {formatDate(ins.valid_from)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      Expires
                    </dt>
                    <dd className="text-slate-700 font-medium">
                      {formatDate(ins.valid_to)}
                    </dd>
                  </div>
                </dl>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openEdit(ins)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ins)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-medium"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">
                {editing ? "Edit Insurance" : "Add Insurance"}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="px-6 py-5 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Insurance Provider (Payer)
                </label>
                <input
                  type="text"
                  value={form.payer}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      payer: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Policy / Member Number
                </label>
                <input
                  type="text"
                  value={form.member_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      member_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Group Number
                </label>
                <input
                  type="text"
                  value={form.group_no}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      group_no: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        valid_from: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={form.valid_to}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        valid_to: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insurance;
