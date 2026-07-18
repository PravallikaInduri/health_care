import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Star,
  ArrowLeft,
  Calendar,
  Stethoscope,
  Layers,
} from "lucide-react";
import {
  getHospitalById,
  getHospitalDepartments,
  type HospitalCardData,
  type DepartmentTileData,
} from "../../api/booking.api";
import DepartmentTile from "../../components/patient/booking/DepartmentTile";

const HospitalDetail = () => {
  const { id = "" } = useParams();
  const [hospital, setHospital] = useState<HospitalCardData | null>(null);
  const [departments, setDepartments] = useState<DepartmentTileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getHospitalById(id),
      getHospitalDepartments(id),
    ])
      .then(([h, d]) => {
        if (cancelled) return;
        setHospital(h.data.data);
        setDepartments(d.data.data);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e?.response?.data?.message || "Failed to load hospital");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-56 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="h-32 rounded-2xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (err || !hospital) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center">
        <p className="text-rose-600 font-medium">
          {err || "Hospital not found"}
        </p>
        <Link
          to="/patient/hospitals"
          className="inline-flex items-center gap-1.5 mt-3 text-blue-600 font-medium"
        >
          <ArrowLeft size={16} /> Back to hospitals
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/patient/hospitals"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600"
      >
        <ArrowLeft size={16} /> All hospitals
      </Link>

      {/* Hero */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
        <div className="h-44 bg-gradient-to-r from-blue-100 to-indigo-100 relative">
          {hospital.cover_url ? (
            <img
              src={hospital.cover_url}
              alt={hospital.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Building2 className="text-blue-400" size={64} />
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {hospital.name}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                {hospital.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} /> {hospital.address}
                  </span>
                )}
                {hospital.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={14} /> {hospital.phone}
                  </span>
                )}
                {hospital.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={14} /> {hospital.email}
                  </span>
                )}
                {hospital.established_year && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} /> Est. {hospital.established_year}
                  </span>
                )}
              </div>
            </div>
            {hospital.avg_rating != null && (
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full">
                <Star
                  size={16}
                  className="text-amber-500 fill-amber-500"
                />
                <span className="font-semibold text-amber-700">
                  {Number(hospital.avg_rating).toFixed(1)}
                </span>
                <span className="text-amber-700/70 text-sm">
                  ({hospital.review_count} reviews)
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Stethoscope size={20} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">
                  {hospital.doctor_count}
                </div>
                <div className="text-xs text-slate-500">Doctors</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers size={20} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">
                  {hospital.department_count}
                </div>
                <div className="text-xs text-slate-500">Departments</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hospital.about && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-slate-900 mb-2">
            About
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            {hospital.about}
          </p>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Departments
        </h2>
        {departments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-slate-500">
              No departments are listed for this hospital yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {departments.map((d) => (
              <DepartmentTile
                key={d.id}
                hospitalId={hospital.id}
                department={d}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HospitalDetail;
