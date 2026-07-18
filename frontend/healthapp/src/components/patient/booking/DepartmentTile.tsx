import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import type { DepartmentTileData } from "../../../api/booking.api";

interface Props {
  hospitalId: string;
  department: DepartmentTileData;
}

const DepartmentTile = ({ hospitalId, department }: Props) => {
  const IconComp =
    (department.icon &&
      (Icons as any)[department.icon]) ||
    Icons.Stethoscope;

  return (
    <Link
      to={`/patient/hospitals/${hospitalId}/departments/${department.id}`}
      className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5 transition-all"
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center mb-4 group-hover:from-blue-500 group-hover:to-indigo-500 group-hover:text-white transition-all">
        <IconComp size={28} />
      </div>
      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition">
        {department.name}
      </h3>
      {department.description && (
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
          {department.description}
        </p>
      )}
      <div className="mt-3 text-xs font-semibold text-slate-500">
        {department.doctor_count}{" "}
        {department.doctor_count === 1 ? "Doctor" : "Doctors"}
      </div>
    </Link>
  );
};

export default DepartmentTile;
