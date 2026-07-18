import { Link } from "react-router-dom";
import {
  Stethoscope,
  Users,
  Building2,
  ClipboardList,
  ArrowUpRight,
} from "lucide-react";

const actions = [
  {
    label: "View Doctors",
    description: "Search & filter every provider",
    path: "/admin/doctors",
    icon: Stethoscope,
    accent: "text-blue-600 bg-blue-50",
  },
  {
    label: "View Patients",
    description: "Search by MRN, name or phone",
    path: "/admin/patients",
    icon: Users,
    accent: "text-emerald-600 bg-emerald-50",
  },
  {
    label: "Manage Facilities",
    description: "Create, edit and assign facilities",
    path: "/admin/facilities",
    icon: Building2,
    accent: "text-amber-600 bg-amber-50",
  },
  {
    label: "Audit Logs",
    description: "Security & access trail",
    path: "/admin/audit-logs",
    icon: ClipboardList,
    accent: "text-violet-600 bg-violet-50",
  },
];

const QuickActions = () => {
  return (
    <section className="bg-white rounded-2xl shadow-sm h-full flex flex-col">
      <header className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">
          Quick Actions
        </h3>
        <p className="text-xs text-slate-500">
          Jump straight into common operations
        </p>
      </header>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.path}
              to={a.path}
              className="group rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 p-4 flex items-start gap-3 transition"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.accent}`}
              >
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">
                    {a.label}
                  </p>
                  <ArrowUpRight
                    size={14}
                    className="text-slate-400 group-hover:text-blue-600"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {a.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActions;
