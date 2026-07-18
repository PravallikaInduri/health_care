import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface DashboardHeroProps {
  /** Small uppercase label above the title (e.g. "Patient Portal") */
  eyebrow?: string;
  /** Main heading — usually a greeting */
  title: string;
  /** Optional supporting line */
  subtitle?: string;
  /** Optional icon shown on the left of the hero */
  icon?: LucideIcon;
  /** Optional inline meta chips shown under the subtitle */
  meta?: ReactNode;
  /** Right-aligned action area (buttons, link, etc.) */
  actions?: ReactNode;
}

/**
 * Brand-teal welcome banner used by every non-admin dashboard so the
 * five portals (Patient / Doctor / Pharmacy / Lab / Hospital) share
 * one consistent header treatment.
 */
const DashboardHero = ({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  meta,
  actions,
}: DashboardHeroProps) => {
  return (
    <section
      className="
        relative overflow-hidden rounded-3xl
        bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400
        text-white shadow-lg shadow-brand-600/20
      "
    >
      {/* Soft decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-10 w-72 h-72 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative px-6 md:px-8 py-7 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          {Icon && (
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 flex items-center justify-center flex-shrink-0">
              <Icon size={28} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/80 font-semibold">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl md:text-3xl font-bold leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-white/85 text-sm md:text-base mt-1">
                {subtitle}
              </p>
            )}
            {meta && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {meta}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
};

export default DashboardHero;
