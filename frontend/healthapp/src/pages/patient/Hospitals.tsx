import { useEffect, useState } from "react";
import { Search, Building2 } from "lucide-react";
import {
  listHospitals,
  type HospitalCardData,
  type PaginationMeta,
} from "../../api/booking.api";
import HospitalCard from "../../components/patient/booking/HospitalCard";

const Hospitals = () => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HospitalCardData[]>([]);
  const [pagination, setPagination] =
    useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listHospitals({ search: debounced, page, limit: 12 })
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => {
        if (cancelled) return;
        setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, page]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <Building2 size={28} />
          <h1 className="text-3xl font-bold">Find a Hospital</h1>
        </div>
        <p className="text-blue-100 text-sm">
          Browse hospitals, explore departments and book an appointment with
          the right specialist.
        </p>

        <div className="mt-5 max-w-xl relative">
          <Search
            size={18}
            className="absolute top-3.5 left-3 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search hospitals by name, city, or address…"
            className="w-full pl-10 pr-4 py-3 rounded-xl text-slate-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-2xl bg-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Building2
            size={48}
            className="mx-auto text-slate-300 mb-3"
          />
          <h3 className="font-semibold text-slate-700">
            No hospitals found
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Try a different search term.
          </p>
        </div>
      ) : (
        <>
          <div className="text-sm text-slate-500">
            Showing {data.length} of {pagination?.total ?? data.length}{" "}
            hospital{(pagination?.total ?? 0) === 1 ? "" : "s"}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.map((h) => (
              <HospitalCard key={h.id} hospital={h} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
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

export default Hospitals;
