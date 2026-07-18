import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Search, UserSearch } from "lucide-react";
import {
  getDepartmentDoctors,
  type DoctorCardData,
  type HospitalCardData,
  type DepartmentTileData,
  type PaginationMeta,
} from "../../api/booking.api";
import DoctorCard from "../../components/patient/booking/DoctorCard";

const DepartmentDoctors = () => {
  const { id = "", deptId = "" } = useParams();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [doctors, setDoctors] = useState<DoctorCardData[]>([]);
  const [hospital, setHospital] = useState<HospitalCardData | null>(null);
  const [department, setDepartment] = useState<DepartmentTileData | null>(
    null
  );
  const [pagination, setPagination] = useState<PaginationMeta | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDepartmentDoctors(id, deptId, {
      search: debounced,
      page,
      limit: 10,
    })
      .then((res) => {
        if (cancelled) return;
        setDoctors(res.data.data);
        setHospital(res.data.hospital);
        setDepartment(res.data.department);
        setPagination(res.data.pagination);
      })
      .catch(() => {
        if (cancelled) return;
        setDoctors([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, deptId, debounced, page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center text-sm text-slate-500">
        <Link to="/patient/hospitals" className="hover:text-blue-600">
          Hospitals
        </Link>
        <ChevronRight size={14} className="mx-1" />
        <Link
          to={`/patient/hospitals/${id}`}
          className="hover:text-blue-600"
        >
          {hospital?.name || "Hospital"}
        </Link>
        <ChevronRight size={14} className="mx-1" />
        <span className="text-slate-900 font-semibold">
          {department?.name || "Department"}
        </span>
      </div>

      <div>
        <Link
          to={`/patient/hospitals/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 mb-3"
        >
          <ArrowLeft size={16} /> Back to {hospital?.name || "hospital"}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {department?.name || "Department"} Doctors
        </h1>
        {department?.description && (
          <p className="text-slate-600 text-sm mt-1">
            {department.description}
          </p>
        )}
      </div>

      <div className="relative max-w-md">
        <Search
          size={18}
          className="absolute top-3 left-3 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search doctors by name…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {loading ? (
        /* Skeleton loaders match the new compact card height */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-slate-100 animate-pulse"
              style={{ height: "300px" }}
            />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div
          className="bg-white rounded-2xl p-12 text-center"
          style={{ border: "1px solid #E2E8F0" }}
        >
          <UserSearch size={44} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">
            No doctors available in this department
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Try another department or come back later.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {doctors.map((d) => (
              <DoctorCard key={d.id} hospitalId={id} doctor={d} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DepartmentDoctors;
