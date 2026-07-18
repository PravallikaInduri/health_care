/**
 * DoctorCard — compact, Apollo/Practo-inspired doctor listing card.
 *
 * Layout (vertical, fixed height ~300px):
 *   ┌──────────────────────────────┐
 *   │  [avatar 80px]  ★ rating     │  ← coloured header strip (56px)
 *   │   Dr. Name                   │
 *   │   Specialty · MBBS, MD       │
 *   │   10 yrs  ·  ₹500            │
 *   │──────────────────────────────│
 *   │  [View Profile]  [Book Now]  │
 *   └──────────────────────────────┘
 */

import {
  Star,
  GraduationCap,
  IndianRupee,
  CalendarPlus,
  Clock,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { DoctorCardData } from "../../../api/booking.api";
import { formatDoctorName } from "../../../utils/doctorName";

interface Props {
  hospitalId: string;
  doctor: DoctorCardData;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

/* Avatar colour palette based on first letter */
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#0EA5E9,#0284C7)",
  "linear-gradient(135deg,#8B5CF6,#7C3AED)",
  "linear-gradient(135deg,#10B981,#059669)",
  "linear-gradient(135deg,#F59E0B,#D97706)",
  "linear-gradient(135deg,#EF4444,#DC2626)",
  "linear-gradient(135deg,#EC4899,#DB2777)",
  "linear-gradient(135deg,#14B8A6,#0D9488)",
  "linear-gradient(135deg,#6366F1,#4F46E5)",
];

const avatarGradient = (name: string) => {
  const code = (name.trim().toUpperCase().charCodeAt(0) || 65) - 65;
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
};

const DoctorCard = ({ hospitalId, doctor }: Props) => {
  const displayName = formatDoctorName(doctor.name);
  const grade = avatarGradient(doctor.name || "Dr");

  return (
    <div
      className="group bg-white flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        borderRadius: "16px",
        border: "1px solid #E2E8F0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      {/* ── Coloured header strip + avatar ──────────────────────── */}
      <div
        className="relative flex flex-col items-center pt-5 pb-3 px-4"
        style={{
          background: "linear-gradient(180deg,#F0F9FF 0%,#FFFFFF 100%)",
          borderBottom: "1px solid #F1F5F9",
        }}
      >
        {/* Rating badge */}
        {doctor.avg_rating != null && (
          <div
            className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{ backgroundColor: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A" }}
          >
            <Star size={10} className="fill-amber-500 text-amber-500" />
            {Number(doctor.avg_rating).toFixed(1)}
            {doctor.review_count != null && (
              <span className="font-normal text-amber-600/70">({doctor.review_count})</span>
            )}
          </div>
        )}

        {/* Avatar */}
        <div
          className="w-[78px] h-[78px] rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white"
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
        >
          {doctor.photo_url ? (
            <img
              src={doctor.photo_url}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-bold text-xl text-white"
              style={{ background: grade }}
            >
              {initials(doctor.name || "Dr")}
            </div>
          )}
        </div>

        {/* Name + specialty */}
        <div className="mt-2.5 text-center w-full">
          <h3
            className="font-bold text-slate-900 truncate leading-tight"
            style={{ fontSize: "14.5px" }}
          >
            {displayName}
          </h3>
          <p
            className="mt-0.5 font-medium truncate"
            style={{ fontSize: "12px", color: "#0284C7" }}
          >
            {doctor.specialty || "General Practice"}
          </p>
        </div>
      </div>

      {/* ── Key info grid ────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-3 space-y-2">
        {/* Qualifications */}
        {doctor.qualifications && (
          <div className="flex items-center gap-2">
            <GraduationCap size={13} className="flex-shrink-0 text-slate-400" />
            <span
              className="text-slate-600 truncate"
              style={{ fontSize: "12px" }}
              title={doctor.qualifications}
            >
              {doctor.qualifications}
            </span>
          </div>
        )}

        {/* Experience */}
        {doctor.experience_years != null && (
          <div className="flex items-center gap-2">
            <Clock size={13} className="flex-shrink-0 text-slate-400" />
            <span className="text-slate-600" style={{ fontSize: "12px" }}>
              {doctor.experience_years}{" "}
              {doctor.experience_years === 1 ? "year" : "years"} experience
            </span>
          </div>
        )}

        {/* Consultation fee */}
        {doctor.consultation_fee != null && (
          <div className="flex items-center gap-2">
            <IndianRupee size={13} className="flex-shrink-0 text-emerald-500" />
            <span
              className="font-semibold"
              style={{ fontSize: "12px", color: "#059669" }}
            >
              {Number(doctor.consultation_fee).toFixed(0)} Consultation
            </span>
          </div>
        )}

        {/* Languages fallback when no fee */}
        {doctor.consultation_fee == null && doctor.languages && (
          <div className="flex items-center gap-2">
            <User size={13} className="flex-shrink-0 text-slate-400" />
            <span className="text-slate-600 truncate" style={{ fontSize: "12px" }}>
              {doctor.languages}
            </span>
          </div>
        )}
      </div>

      {/* ── Action buttons ───────────────────────────────────────── */}
      <div
        className="flex gap-2 px-4 pb-4 pt-1"
      >
        <Link
          to={`/patient/hospitals/${hospitalId}/doctors/${doctor.id}`}
          className="flex-1 text-center py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-slate-50"
          style={{ color: "#475569", borderColor: "#E2E8F0" }}
        >
          View Profile
        </Link>
        <Link
          to={`/patient/hospitals/${hospitalId}/doctors/${doctor.id}/book`}
          className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg,#0EA5E9,#0284C7)",
            boxShadow: "0 3px 10px rgba(14,165,233,0.28)",
          }}
        >
          <CalendarPlus size={12} />
          Book Now
        </Link>
      </div>
    </div>
  );
};

export default DoctorCard;
