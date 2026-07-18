import { Building2, MapPin, Star, Stethoscope, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import type { HospitalCardData } from "../../../api/booking.api";

interface Props {
  hospital: HospitalCardData;
}

const HospitalCard = ({ hospital }: Props) => {
  return (
    <Link
      to={`/patient/hospitals/${hospital.id}`}
      className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
    >
      <div className="h-36 bg-gradient-to-r from-blue-100 to-indigo-100 relative overflow-hidden">
        {hospital.cover_url ? (
          <img
            src={hospital.cover_url}
            alt={hospital.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="text-blue-400" size={56} />
          </div>
        )}
        {hospital.avg_rating != null && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 text-sm font-semibold shadow">
            <Star size={14} className="text-amber-500 fill-amber-500" />
            {Number(hospital.avg_rating).toFixed(1)}
            <span className="text-slate-500 text-xs ml-1">
              ({hospital.review_count})
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition">
          {hospital.name}
        </h3>

        <div className="flex items-start gap-2 text-sm text-slate-600 mt-2">
          <MapPin size={14} className="mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">
            {hospital.address || hospital.city || "—"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm">
            <Stethoscope size={16} className="text-blue-500" />
            <div>
              <div className="font-semibold text-slate-900">
                {hospital.doctor_count}
              </div>
              <div className="text-xs text-slate-500">Doctors</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Layers size={16} className="text-indigo-500" />
            <div>
              <div className="font-semibold text-slate-900">
                {hospital.department_count}
              </div>
              <div className="text-xs text-slate-500">Departments</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default HospitalCard;
