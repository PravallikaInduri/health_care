import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  listPatients,
  type AdminPatient,
  type ListPatientsParams,
  type PaginationMeta,
} from "../../api/admin.api";

const formatDob = (dob: string) => {
  if (!dob) return "—";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return dob;
  return d.toLocaleDateString();
};

type PatientSortColumn = NonNullable<ListPatientsParams["sortBy"]>;

const PatientSortHead = ({
  column,
  label,
  sortBy,
  sortDir,
  onSort,
}: {
  column: PatientSortColumn;
  label: string;
  sortBy: PatientSortColumn;
  sortDir: NonNullable<ListPatientsParams["sortDir"]>;
  onSort: (column: PatientSortColumn) => void;
}) => (
  <button
    type="button"
    onClick={() => onSort(column)}
    className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
  >
    {label}
    {sortBy === column && (
      <span>{sortDir === "asc" ? "↑" : "↓"}</span>
    )}
  </button>
);

const PatientsDirectory = () => {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] =
    useState<NonNullable<ListPatientsParams["sortBy"]>>("created_at");
  const [sortDir, setSortDir] =
    useState<NonNullable<ListPatientsParams["sortDir"]>>("desc");

  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [pagination, setPagination] =
    useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo<ListPatientsParams>(
    () => ({
      search: search || undefined,
      page,
      limit,
      sortBy,
      sortDir,
    }),
    [search, page, limit, sortBy, sortDir]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listPatients(params)
      .then((res) => {
        if (!active) return;
        setPatients(res.data.data || []);
        setPagination(res.data.pagination);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Failed to load patients"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const toggleSort = (
    column: NonNullable<ListPatientsParams["sortBy"]>
  ) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <form
          onSubmit={onSearchSubmit}
          className="grid md:grid-cols-12 gap-3"
        >
          <div className="md:col-span-10 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by MRN, name or phone"
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="md:col-span-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">
                  <PatientSortHead column="mrn" label="MRN" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-6 py-4">
                  <PatientSortHead column="name" label="Name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-6 py-4">
                  <PatientSortHead column="dob" label="DOB" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
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
                    Loading patients…
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

              {!loading && !error && patients.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No patients match your search.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                patients.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-slate-700">
                      {p.mrn}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            p.photo_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              `${p.first_name} ${p.last_name}`
                            )}&background=0ea5e9&color=fff`
                          }
                          alt={`${p.first_name} ${p.last_name}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium text-slate-800">
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {p.email || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDob(p.dob)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {p.phone || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/patients/${p.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                      >
                        <Eye size={14} /> Details
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}{" "}
              · {pagination.total} patients
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
                      ? Math.min(pagination.totalPages, p + 1)
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
    </div>
  );
};

export default PatientsDirectory;
