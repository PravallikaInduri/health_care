import { Outlet } from "react-router-dom";
import DoctorSidebar from "../components/doctor/DoctorSidebar";
import DoctorTopbar from "../components/doctor/DoctorTopbar";

const DoctorLayout = () => {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      <DoctorSidebar />

      <div className="flex-1">
        <DoctorTopbar />

        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DoctorLayout;
