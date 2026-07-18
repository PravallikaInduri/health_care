/**
 * PortalSidebar — shared sidebar shell used by every portal
 * (Patient, Doctor, Pharmacy, Lab, Hospital).
 *
 * Each portal passes its own menu items, portal name, and icon.
 * All other styles are consistent across the product.
 */

import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";

export interface SidebarMenuItem {
  title: string;
  path: string;
  icon: LucideIcon;
  /** Use `end` matching (exact) for dashboard routes. Default false. */
  exact?: boolean;
}

interface PortalSidebarProps {
  /** Short name shown in the header, e.g. "Patient", "Doctor" */
  portalName: string;
  /** Small subtitle, e.g. "Your healthcare, in one place" */
  portalSubtitle: string;
  /** Icon shown in the coloured header tile */
  portalIcon: LucideIcon;
  /** Gradient for the header icon tile: any valid CSS gradient string */
  iconGradient?: string;
  menuItems: SidebarMenuItem[];
}

const PortalSidebar = ({
  portalName,
  portalSubtitle,
  portalIcon: PortalIcon,
  iconGradient = "linear-gradient(135deg,#0EA5E9,#0284C7)",
  menuItems,
}: PortalSidebarProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className="w-60 bg-white flex flex-col flex-shrink-0 sticky top-0 h-screen overflow-hidden"
      style={{ borderRight: "1px solid #E2E8F0" }}
    >
      {/* ── Brand header ─────────────────────────────────── */}
      <div
        className="px-4 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid #E2E8F0" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: iconGradient,
            boxShadow: "0 6px 16px rgba(14,165,233,0.28)",
          }}
        >
          <PortalIcon size={17} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">
            {portalName}
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            {portalSubtitle}
          </p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 outline-none"
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: "#EFF6FF",
                      color: "#0284C7",
                      fontWeight: 600,
                    }
                  : {}
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    style={
                      isActive
                        ? { backgroundColor: "#DBEAFE", color: "#0284C7" }
                        : { backgroundColor: "#F8FAFC", color: "#94A3B8" }
                    }
                  >
                    <Icon size={15} />
                  </span>
                  <span
                    className={isActive ? "text-sky-700" : "text-slate-600"}
                  >
                    {item.title}
                  </span>
                  {isActive && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "#0EA5E9" }}
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Logout ───────────────────────────────────────── */}
      <div
        className="px-3 py-3"
        style={{ borderTop: "1px solid #F1F5F9" }}
      >
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <LogOut size={14} />
          </span>
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default PortalSidebar;
