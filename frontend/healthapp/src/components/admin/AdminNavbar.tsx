import { CalendarDays, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import NotificationsBell from "../common/NotificationsBell";

const TITLES: Array<{ test: RegExp; title: string; subtitle: string }> = [
  {
    test: /^\/admin\/?$/,
    title: "Admin Dashboard",
    subtitle: "Live overview of doctors, patients and facilities",
  },
  {
    test: /^\/admin\/doctors\/[^/]+\/schedule$/,
    title: "Doctor Schedule",
    subtitle: "Read-only view of templates and overrides",
  },
  {
    test: /^\/admin\/doctors\/[^/]+$/,
    title: "Doctor Details",
    subtitle: "Verification and provider profile",
  },
  {
    test: /^\/admin\/doctors\/?$/,
    title: "Doctors Directory",
    subtitle: "Search, filter and review every doctor",
  },
  {
    test: /^\/admin\/pending-doctors\/?$/,
    title: "Pending Doctor Requests",
    subtitle: "Approve or reject new provider applications",
  },
  {
    test: /^\/admin\/patients\/[^/]+$/,
    title: "Patient Record",
    subtitle: "Full profile, appointments and clinical data",
  },
  {
    test: /^\/admin\/patients\/?$/,
    title: "Patients Directory",
    subtitle: "Search by MRN, name or phone",
  },
  {
    test: /^\/admin\/facilities\/[^/]+$/,
    title: "Facility Details",
    subtitle: "Profile and assigned providers",
  },
  {
    test: /^\/admin\/facilities\/?$/,
    title: "Facility Management",
    subtitle: "Create, edit and assign care facilities",
  },
  {
    test: /^\/admin\/audit-logs\/?$/,
    title: "Audit Logs",
    subtitle: "Security and access trail",
  },
];

const resolvePageMeta = (pathname: string) => {
  const match = TITLES.find((t) => t.test.test(pathname));
  return match ?? TITLES[0];
};

const AdminNavbar = () => {
  const { pathname } = useLocation();
  const meta = resolvePageMeta(pathname);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          {meta.title}
        </h1>
        <p className="text-sm text-slate-500">
          {meta.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <span className="text-sm text-slate-400">
            Quick search…
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm">
          <CalendarDays size={16} />
          {today}
        </div>

        <NotificationsBell variant="light" />
      </div>
    </div>
  );
};

export default AdminNavbar;
