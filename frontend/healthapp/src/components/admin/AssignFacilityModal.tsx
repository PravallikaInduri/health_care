import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

import {
  listFacilities,
  assignFacilityToProvider,
  type AdminFacility,
} from "../../api/admin.api";

interface Props {
  open: boolean;
  providerId: string;
  /** Facility ids that are already assigned (to be excluded). */
  assignedIds: string[];
  onClose: () => void;
  onAssigned: () => void;
}

const AssignFacilityModal = ({
  open,
  providerId,
  assignedIds,
  onClose,
  onAssigned,
}: Props) => {
  const [facilities, setFacilities] = useState<
    AdminFacility[]
  >([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected("");
    setLoading(true);
    /* Pull a generous page so admins can see all available */
    listFacilities({ page: 1, limit: 100, sortBy: "name", sortDir: "asc" })
      .then((res) => {
        const all = res.data.data || [];
        const remaining = all.filter(
          (f) => !assignedIds.includes(f.id)
        );
        setFacilities(remaining);
      })
      .catch(() => {
        toast.error("Failed to load facilities");
      })
      .finally(() => setLoading(false));
  }, [open, assignedIds]);

  if (!open) return null;

  const handleSave = async () => {
    if (!selected) {
      toast.error("Select a facility");
      return;
    }
    try {
      setSaving(true);
      await assignFacilityToProvider(providerId, selected);
      toast.success("Facility assigned");
      onAssigned();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to assign facility"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">
            Assign Facility
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Select Facility
            </label>
            {loading ? (
              <p className="text-sm text-slate-400">Loading facilities…</p>
            ) : facilities.length === 0 ? (
              <p className="text-sm text-slate-400">
                No more facilities available to assign.
              </p>
            ) : (
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a facility…</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type.charAt(0) + f.type.slice(1).toLowerCase()})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selected || facilities.length === 0}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignFacilityModal;
