import { Outlet } from "react-router-dom";
import PharmacySidebar from "../components/pharmacy/PharmacySidebar";
import PharmacyTopbar from "../components/pharmacy/PharmacyTopbar";

const PharmacyLayout = () => {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      <PharmacySidebar />
      <div className="flex-1">
        <PharmacyTopbar />
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default PharmacyLayout;
