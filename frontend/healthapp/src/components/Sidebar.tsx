import {
  LayoutDashboard,
  UserCheck,
  LogOut,
} from "lucide-react";

import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <aside
      className="
      w-64
      bg-slate-900
      text-white
      min-h-screen
      p-6
    "
    >
      <h2 className="text-2xl font-bold">
        Admin
      </h2>

      <nav className="mt-10 space-y-4">

        <Link
          to="/admin"
          className="flex gap-3"
        >
          <LayoutDashboard />
          Dashboard
        </Link>

        <Link
          to="/admin/pending"
          className="flex gap-3"
        >
          <UserCheck />
          Pending Doctors
        </Link>

        <button className="flex gap-3">
          <LogOut />
          Logout
        </button>

      </nav>
    </aside>
  );
};

export default Sidebar;