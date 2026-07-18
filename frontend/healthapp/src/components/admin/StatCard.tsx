import type { ComponentType } from "react";

export type StatAccent =
  | "amber"
  | "emerald"
  | "blue"
  | "violet"
  | "rose"
  | "slate";

const ACCENTS: Record<
  StatAccent,
  { iconBg: string; iconColor: string; ring: string }
> = {
  amber: {
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    ring: "ring-amber-100",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    ring: "ring-emerald-100",
  },
  blue: {
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    ring: "ring-blue-100",
  },
  violet: {
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    ring: "ring-violet-100",
  },
  rose: {
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    ring: "ring-rose-100",
  },
  slate: {
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    ring: "ring-slate-100",
  },
};

type Props = {
  title: string;
  value: string | number;
  hint?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  accent?: StatAccent;
};

const StatCard = ({
  title,
  value,
  hint,
  icon: Icon,
  accent = "blue",
}: Props) => {
  const colors = ACCENTS[accent];

  return (
    <div className="bg-white rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition flex items-center gap-4">
      {Icon && (
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ring-4 ${colors.iconBg} ${colors.ring}`}
        >
          <Icon size={22} className={colors.iconColor} />
        </div>
      )}

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p className="text-2xl font-bold text-slate-900 leading-tight mt-1">
          {value}
        </p>
        {hint && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
