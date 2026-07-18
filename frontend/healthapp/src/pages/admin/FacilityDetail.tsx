import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Stethoscope,
  Eye,
  CalendarDays,
  UserPlus,
  Trash2,
  Search as SearchIcon,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getFacilityWithProviders,
  getAssignableProvidersForFacility,
  assignFacilityToProvider,
  removeFacilityFromProvider,
  type AdminFacility,
  type FacilityProvider,
  type AssignableProvider,
} from "../../api/admin.api";

import FacilityDepartmentsPanel from "../../components/admin/FacilityDepartmentsPanel";

const TYPE_STYLES: Record<string, string> = {
  HOSPITAL: "bg-blue-50 text-blue-700 ring-blue-200",
  CLINIC: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LAB: "bg-violet-50 text-violet-700 ring-violet-200",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const FacilityDetail = () => {
  const { id } = useParams();
  const [facility, setFacility] =
    useState<AdminFacility | null>(null);
  const [providers, setProviders] = useState<
    FacilityProvider[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignable, setAssignable] = useState<AssignableProvider[]>([]);
  const [assignableLoading, setAssignableLoading] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getFacilityWithProviders(id);
      setFacility(res.data.data.facility);
      setProviders(res.data.data.providers || []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load facility"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openAssignModal = async () => {
    if (!id) return;
    setShowAssignModal(true);
    setAssignableLoading(true);
    setAssignSearch("");
    try {
      const res = await getAssignableProvidersForFacility(id);
      setAssignable(res.data.data.providers || []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to load providers"
      );
    } finally {
      setAssignableLoading(false);
    }
  };

  const handleAssign = async (providerId: string) => {
    if (!id) return;
    setAssigningId(providerId);
    try {
      await assignFacilityToProvider(providerId, id);
      toast.success("Provider assigned");
      setAssignable((prev) =>
        prev.filter((p) => p.id !== providerId)
      );
      void reload();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to assign provider"
      );
    } finally {
      setAssigningId(null);
    }
  };

  const handleRemove = async (providerId: string, name: string) => {
    if (!id) return;
    if (
      !window.confirm(
        `Remove ${name} from this facility?`
      )
    ) {
      return;
    }
    setRemovingId(providerId);
    try {
      await removeFacilityFromProvider(providerId, id);
      toast.success("Provider removed");
      setProviders((prev) =>
        prev.filter((p) => p.id !== providerId)
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to remove provider"
      );
    } finally {
      setRemovingId(null);
    }
  };

  const filteredAssignable = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return assignable;
    return assignable.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.specialty || "").toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [assignable, assignSearch]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400">
        Loading facility…
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-rose-500">
        Facility not found.
      </div>
    );
  }

  const typeLabel =
    facility.type.charAt(0) +
    facility.type.slice(1).toLowerCase();

  return (
    <div className="space-y-4">
      <Link
        to="/admin/facilities"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={16} /> Back to facilities
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-slate-800">
              {facility.name}
            </h2>
            <span
              className={`inline-flex mt-1 items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                TYPE_STYLES[facility.type] ||
                "bg-slate-50 text-slate-700 ring-slate-200"
              }`}
            >
              {typeLabel}
            </span>
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/40">
            <MapPin
              size={18}
              className="text-slate-400 mt-0.5"
            />
            <div className="min-w-0">
              <p className="text-slate-400 text-xs">Address</p>
              <p className="text-slate-700 break-words">
                {facility.address || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/40">
            <Phone
              size={18}
              className="text-slate-400 mt-0.5"
            />
            <div className="min-w-0">
              <p className="text-slate-400 text-xs">Phone</p>
              <p className="text-slate-700 break-words">
                {facility.phone || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {id && <FacilityDepartmentsPanel facilityId={id} />}

      <div className="bg-white rounded-2xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Stethoscope size={18} className="text-blue-600" />
              Assigned Providers
            </h3>
            <p className="text-sm text-slate-400">
              {providers.length} doctor
              {providers.length === 1 ? "" : "s"} associated with
              this facility
            </p>
          </div>
          <button
            onClick={openAssignModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow-sm"
          >
            <UserPlus size={16} /> Assign Provider
          </button>
        </div>

        {showAssignModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h4 className="text-lg font-semibold text-slate-800">
                    Assign Provider
                  </h4>
                  <p className="text-xs text-slate-400">
                    Pick an approved doctor to associate with{" "}
                    {facility.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-3 border-b border-slate-100">
                <div className="relative">
                  <SearchIcon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search by name, specialty or email…"
                    value={assignSearch}
                    onChange={(e) =>
                      setAssignSearch(e.target.value)
                    }
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-2">
                {assignableLoading && (
                  <div className="p-10 text-center text-slate-400 text-sm">
                    Loading providers…
                  </div>
                )}

                {!assignableLoading &&
                  filteredAssignable.length === 0 && (
                    <div className="p-10 text-center text-slate-400 text-sm">
                      No matching providers available to assign.
                    </div>
                  )}

                {!assignableLoading &&
                  filteredAssignable.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition"
                    >
                      <img
                        src={
                          p.photo_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            p.name
                          )}&background=2563eb&color=fff`
                        }
                        alt={p.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {p.specialty || "—"} · {p.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAssign(p.id)}
                        disabled={assigningId === p.id}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
                      >
                        {assigningId === p.id
                          ? "Assigning…"
                          : "Assign"}
                      </button>
                    </div>
                  ))}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Doctor
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Specialty
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {providers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No providers are currently assigned to this
                    facility.
                  </td>
                </tr>
              )}

              {providers.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50/60"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          p.photo_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            p.name
                          )}&background=2563eb&color=fff`
                        }
                        alt={p.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <p className="font-medium text-slate-800">
                        {p.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {p.specialty || "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {p.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${
                        STATUS_STYLES[p.verification_status] ||
                        "bg-slate-50 text-slate-700 ring-slate-200"
                      }`}
                    >
                      {p.verification_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        to={`/admin/doctors/${p.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                      >
                        <Eye size={14} /> Details
                      </Link>
                      <Link
                        to={`/admin/doctors/${p.id}/schedule`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
                      >
                        <CalendarDays size={14} /> Schedule
                      </Link>
                      <button
                        onClick={() => handleRemove(p.id, p.name)}
                        disabled={removingId === p.id}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm font-medium disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                        {removingId === p.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FacilityDetail;
