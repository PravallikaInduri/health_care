import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  listFacilities,
  deleteFacility,
  type AdminFacility,
  type ListFacilitiesParams,
  type PaginationMeta,
  type FacilityType,
} from "../../api/admin.api";
import FacilityFormModal from "../../components/admin/FacilityFormModal";

const TYPE_STYLES: Record<string, string> = {
  HOSPITAL: "bg-blue-50 text-blue-700 ring-blue-200",
  CLINIC: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LAB: "bg-violet-50 text-violet-700 ring-violet-200",
};

const TypeBadge = ({ type }: { type: string }) => {
  const cls =
    TYPE_STYLES[type] ||
    "bg-slate-50 text-slate-700 ring-slate-200";
  const label = type.charAt(0) + type.slice(1).toLowerCase();
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${cls}`}
    >
      {label}
    </span>
  );
};

const Facilities = () => {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<FacilityType | "">("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [facilities, setFacilities] = useState<
    AdminFacility[]
  >([]);
  const [pagination, setPagination] =
    useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Modals */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminFacility | null>(
    null
  );

  const params = useMemo<ListFacilitiesParams>(
    () => ({
      search: search || undefined,
      type: typeFilter || undefined,
      page,
      limit,
      sortBy: "name",
      sortDir: "asc",
    }),
    [search, typeFilter, page, limit]
  );

  const load = () => {
    setLoading(true);
    setError(null);

    listFacilities(params)
      .then((res) => {
        setFacilities(res.data.data || []);
        setPagination(res.data.pagination);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            "Failed to load facilities"
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (f: AdminFacility) => {
    setEditing(f);
    setFormOpen(true);
  };

  const handleDelete = async (f: AdminFacility) => {
    const ok = window.confirm(
      `Delete facility "${f.name}"? This cannot be undone.`
    );
    if (!ok) return;
    try {
      await deleteFacility(f.id);
      toast.success("Facility deleted");
      /*
      If the last item on the current page was deleted,
      step back a page so we don't end up on an empty page.
      */
      if (
        facilities.length === 1 &&
        pagination &&
        pagination.page > 1
      ) {
        setPage((p) => p - 1);
      } else {
        load();
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to delete facility"
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus size={16} /> Add Facility
        </button>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <form
          onSubmit={onSearchSubmit}
          className="grid md:grid-cols-12 gap-3"
        >
          <div className="md:col-span-7 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search facility by name"
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setPage(1);
              setTypeFilter(
                e.target.value as FacilityType | ""
              );
            }}
            className="md:col-span-3 px-3 py-3 rounded-xl border border-slate-200"
          >
            <option value="">All Types</option>
            <option value="HOSPITAL">Hospital</option>
            <option value="CLINIC">Clinic</option>
            <option value="LAB">Lab</option>
          </select>

          <button
            type="submit"
            className="md:col-span-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Facility Name
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Address
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Loading facilities…
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-rose-500"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                facilities.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      No facilities yet. Click{" "}
                      <span className="font-medium text-slate-600">
                        Add Facility
                      </span>{" "}
                      to create one.
                    </td>
                  </tr>
                )}

              {!loading &&
                !error &&
                facilities.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {f.logo_url ? (
                          <img
                            src={f.logo_url}
                            alt={f.name}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"
                            title="No logo uploaded"
                          >
                            <Building2 size={18} />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">
                            {f.name}
                          </p>
                          {typeof f.provider_count ===
                            "number" && (
                            <p className="text-xs text-slate-400">
                              {f.provider_count} doctor
                              {f.provider_count === 1
                                ? ""
                                : "s"}{" "}
                              assigned
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <TypeBadge type={f.type} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {f.address || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {f.phone || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/facilities/${f.id}`}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
                        >
                          <Eye size={14} /> View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleEdit(f)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(f)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-medium"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of{" "}
              {pagination.totalPages} · {pagination.total}{" "}
              facilit
              {pagination.total === 1 ? "y" : "ies"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-50"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                onClick={() =>
                  setPage((p) =>
                    pagination
                      ? Math.min(
                          pagination.totalPages,
                          p + 1
                        )
                      : p
                  )
                }
                disabled={
                  pagination.page >= pagination.totalPages
                }
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-50"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <FacilityFormModal
        open={formOpen}
        facility={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  );
};

export default Facilities;
