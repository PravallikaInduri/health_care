import { useEffect, useState } from "react";
import { Layers, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  listDepartments,
  listFacilityDepartments,
  attachDepartmentToFacility,
  detachDepartmentFromFacility,
  type AdminDepartment,
} from "../../api/admin.api";

interface Props {
  facilityId: string;
}

const FacilityDepartmentsPanel = ({ facilityId }: Props) => {
  const [items, setItems] = useState<AdminDepartment[]>([]);
  const [allDepts, setAllDepts] = useState<AdminDepartment[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listFacilityDepartments(facilityId);
      setItems(r.data.data);
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
  }, [facilityId]);

  const openModal = async () => {
    try {
      const all = await listDepartments();
      setAllDepts(all.data.data);
      setOpen(true);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Failed to fetch departments"
      );
    }
  };

  const attach = async (deptId: string) => {
    try {
      setBusyId(deptId);
      await attachDepartmentToFacility(facilityId, deptId);
      toast.success("Department attached");
      await load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Attach failed"
      );
    } finally {
      setBusyId(null);
    }
  };

  const detach = async (deptId: string) => {
    if (!confirm("Remove this department from the facility?")) return;
    try {
      setBusyId(deptId);
      await detachDepartmentFromFacility(facilityId, deptId);
      toast.success("Department removed");
      await load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Remove failed"
      );
    } finally {
      setBusyId(null);
    }
  };

  const candidates = allDepts.filter(
    (d) => !items.some((x) => x.id === d.id)
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" />
            Departments
          </h3>
          <p className="text-sm text-slate-400">
            {items.length} department
            {items.length === 1 ? "" : "s"} offered at this facility
          </p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium shadow-sm"
        >
          <Plus size={16} /> Attach Department
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-slate-500 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">
            No departments attached yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium"
              >
                {d.name}
                <button
                  onClick={() => detach(d.id)}
                  disabled={busyId === d.id}
                  className="p-0.5 rounded-full hover:bg-indigo-100"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-slate-900">
                Attach Department
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  {allDepts.length === 0
                    ? "No departments exist yet. Create them from the Departments page first, then attach them here."
                    : "All departments are already attached."}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {candidates.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => attach(d.id)}
                      disabled={busyId === d.id}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center justify-between disabled:opacity-60"
                    >
                      <span className="font-medium">{d.name}</span>
                      <Plus size={14} className="text-slate-400" />
                    </button>
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

export default FacilityDepartmentsPanel;
