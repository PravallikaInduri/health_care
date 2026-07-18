import { Outlet } from "react-router-dom";
import LabSidebar from "../components/lab/LabSidebar";

const LabLayout = () => {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      <LabSidebar />
      <div className="flex-1 min-w-0">
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default LabLayout;
