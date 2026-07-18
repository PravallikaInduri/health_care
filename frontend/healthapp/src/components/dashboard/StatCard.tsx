import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

/** Color palette options. Each maps to a coordinated icon tile colour. */
export type StatTone =
  | "teal"
  | "amber"
  | "emerald"
  | "violet"
  | "sky"
  | "rose"
  | "slate";

const TONES: Record<
  StatTone,
  { tile: string; valueAccent: string; ring: string }
> = {
  teal: {
    tile: "bg-brand-50 text-brand-700",
    valueAccent: "text-slate-900",
    ring: "ring-brand-100",
  },
  amber: {
    tile: "bg-amber-50 text-amber-600",
    valueAccent: "text-slate-900",
    ring: "ring-amber-100",
  },
  emerald: {
    tile: "bg-emerald-50 text-emerald-600",
    valueAccent: "text-slate-900",
    ring: "ring-emerald-100",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600",
    valueAccent: "text-slate-900",
    ring: "ring-violet-100",
  },
  sky: {
    tile: "bg-sky-50 text-sky-600",
    valueAccent: "text-slate-900",
    ring: "ring-sky-100",
  },
  rose: {
    tile: "bg-rose-50 text-rose-600",
    valueAccent: "text-slate-900",
    ring: "ring-rose-100",
  },
  slate: {
    tile: "bg-slate-100 text-slate-600",
    valueAccent: "text-slate-900",
    ring: "ring-slate-100",
  },
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: StatTone;
  sublabel?: string;
  /** Optional link — when set, the whole card is a router link. */
  to?: string;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  tone = "teal",
  sublabel,
  to,
}: StatCardProps) => {
  const t = TONES[tone];

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.tile}`}
        >
          <Icon size={22} />
        </div>
        {to && (
          <span className="text-slate-300 group-hover:text-brand-600 transition">
            <ArrowUpRight size={18} />
          </span>
        )}
      </div>
      <p
        className={`mt-4 text-3xl font-bold tabular-nums leading-none ${t.valueAccent}`}
      >
        {value}
      </p>
      <p className="text-slate-500 text-sm mt-1">{label}</p>
      {sublabel && (
        <p className="text-xs text-slate-400 mt-1 truncate">{sublabel}</p>
      )}
    </>
  );

  const className = `
    group relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm
    hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-200
    transition-all duration-200
  `;

  return to ? (
    <Link to={to} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
};

export default StatCard;
