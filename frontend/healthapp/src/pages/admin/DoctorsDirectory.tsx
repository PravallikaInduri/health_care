import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Eye,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  listDoctors,
  type AdminDoctor,
  type ListDoctorsParams,
  type PaginationMeta,
} from "../../api/admin.api";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const StatusBadge = ({ status }: { status: string }) => {
  const cls =
    STATUS_STYLES[status] ||
    "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ${cls}`}
    >
      {status}
    </span>
  );
};

type DoctorSortColumn = NonNullable<ListDoctorsParams["sortBy"]>;

const DoctorSortHead = ({
  column,
  label,
  sortBy,
  sortDir,
  onSort,
}: {
  column: DoctorSortColumn;
  label: string;
  sortBy: DoctorSortColumn;
  sortDir: NonNullable<ListDoctorsParams["sortDir"]>;
  onSort: (column: DoctorSortColumn) => void;
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

const DoctorsDirectory = () => {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] =
    useState<NonNullable<ListDoctorsParams["sortBy"]>>("created_at");
  const [sortDir, setSortDir] =
    useState<NonNullable<ListDoctorsParams["sortDir"]>>("desc");

  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [pagination, setPagination] =
    useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo<ListDoctorsParams>(
    () => ({
      search: search || undefined,
      status: (status as ListDoctorsParams["status"]) || undefined,
      specialty: specialty || undefined,
      page,
      limit,
      sortBy,
      sortDir,
    }),
    [search, status, specialty, page, limit, sortBy, sortDir]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listDoctors(params)
      .then((res) => {
        if (!active) return;
        setDoctors(res.data.data || []);
        setPagination(res.data.pagination);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Failed to load doctors"
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
    column: NonNullable<ListDoctorsParams["sortBy"]>
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
      <div className="flex items-center justify-end">
        <Link
          to="/admin/pending-doctors"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          Review Pending
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <form
          onSubmit={onSearchSubmit}
          className="grid md:grid-cols-12 gap-3"
        >
          <div className="md:col-span-5 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email or specialty"
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="md:col-span-2 px-3 py-3 rounded-xl border border-slate-200"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <input
            value={specialty}
            onChange={(e) => {
              setPage(1);
              setSpecialty(e.target.value);
            }}
            placeholder="Filter by specialty"
            className="md:col-span-3 px-3 py-3 rounded-xl border border-slate-200"
          />

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
                  <DoctorSortHead column="name" label="Doctor" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-6 py-4">
                  <DoctorSortHead column="email" label="Email" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-6 py-4">
                  <DoctorSortHead
                    column="specialty"
                    label="Specialty"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-6 py-4">
                  <DoctorSortHead column="status" label="Status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
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
                    Loading doctors…
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

              {!loading && !error && doctors.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No doctors match your filters.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                doctors.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            doc.photo_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              doc.name
                            )}&background=2563eb&color=fff`
                          }
                          alt={doc.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium text-slate-800">
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {doc.npi_or_mci || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {doc.email}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {doc.specialty || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={doc.verification_status}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/doctors/${doc.id}`}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                        >
                          <Eye size={14} /> Details
                        </Link>
                        <Link
                          to={`/admin/doctors/${doc.id}/schedule`}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
                        >
                          <CalendarDays size={14} /> Schedule
                        </Link>
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
              Page {pagination.page} of {pagination.totalPages}{" "}
              · {pagination.total} doctors
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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

export default DoctorsDirectory;
