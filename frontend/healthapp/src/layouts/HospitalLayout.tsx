import { Outlet } from "react-router-dom";
import HospitalSidebar from "../components/hospital/HospitalSidebar";

const HospitalLayout = () => {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      <HospitalSidebar />
      <div className="flex-1 min-w-0">
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default HospitalLayout;
