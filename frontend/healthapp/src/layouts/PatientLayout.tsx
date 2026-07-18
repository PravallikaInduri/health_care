import { Outlet } from "react-router-dom";
import PatientSidebar from "../components/patient/PatientSidebar";
import PatientTopbar from "../components/patient/PatientTopbar";

const PatientLayout = () => {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      <PatientSidebar />

      <div className="flex-1">
        <PatientTopbar />

        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default PatientLayout;