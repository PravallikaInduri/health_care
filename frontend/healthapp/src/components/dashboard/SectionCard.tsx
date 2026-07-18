import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Right-aligned slot for "View all" links or buttons. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Consistent content section used on every non-admin dashboard
 * to host lists, queues, schedules, etc.
 */
const SectionCard = ({
  title,
  subtitle,
  icon: Icon,
  action,
  className = "",
  children,
}: SectionCardProps) => {
  return (
    <section
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}
    >
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
              <Icon size={18} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </header>

      <div className="p-5">{children}</div>
    </section>
  );
};

export default SectionCard;
