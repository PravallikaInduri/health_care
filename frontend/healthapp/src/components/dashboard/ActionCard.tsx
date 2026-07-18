import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface ActionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  to: string;
  /** When true, the card uses brand-teal as its default background. */
  primary?: boolean;
}

/**
 * Quick-action tile used on every non-admin dashboard.
 * Default state: white card, brand-teal icon.
 * Hover state:   brand-teal background, white icon/text + lift.
 *
 * `primary` flips the defaults so a featured action stands out
 * straight away (and stays teal on hover too).
 */
const ActionCard = ({
  title,
  description,
  icon: Icon,
  to,
  primary = false,
}: ActionCardProps) => {
  const base = primary
    ? `
      bg-gradient-to-br from-brand-600 to-brand-500
      text-white border-transparent shadow-md shadow-brand-600/25
      hover:from-brand-700 hover:to-brand-600
    `
    : `
      bg-white text-slate-800 border-slate-100 shadow-sm
      hover:bg-brand-600 hover:text-white hover:border-brand-600
      hover:shadow-lg hover:shadow-brand-600/25
    `;

  const iconWrap = primary
    ? "bg-white/20 text-white"
    : "bg-brand-50 text-brand-700 group-hover:bg-white/20 group-hover:text-white";

  const descCls = primary
    ? "text-white/85"
    : "text-slate-500 group-hover:text-white/85";

  const arrowCls = primary
    ? "text-white/80"
    : "text-slate-300 group-hover:text-white";

  return (
    <Link
      to={to}
      className={`
        group relative block rounded-2xl border p-5 md:p-6
        transition-all duration-200 hover:-translate-y-0.5
        ${base}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${iconWrap}`}
        >
          <Icon size={22} />
        </div>
        <ArrowRight
          size={18}
          className={`mt-2 transition-transform group-hover:translate-x-0.5 ${arrowCls}`}
        />
      </div>
      <h3 className="font-semibold text-base md:text-lg mt-4">{title}</h3>
      {description && (
        <p className={`text-sm mt-1 leading-snug ${descCls}`}>
          {description}
        </p>
      )}
    </Link>
  );
};

export default ActionCard;
