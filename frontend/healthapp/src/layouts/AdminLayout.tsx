import { Outlet } from "react-router-dom";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminNavbar from "../components/admin/AdminNavbar";

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 pt-6">
          <AdminNavbar />
        </div>

        <main className="flex-1 px-6 pb-8 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
