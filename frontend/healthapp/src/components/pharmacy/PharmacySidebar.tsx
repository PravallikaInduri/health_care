import { LayoutDashboard, Pill, RefreshCw, User, ListChecks } from "lucide-react";
import PortalSidebar from "../shared/PortalSidebar";

const menuItems = [
  { title: "Dashboard",         path: "/pharmacy/dashboard",      icon: LayoutDashboard, exact: true },
  { title: "Prescriptions",     path: "/pharmacy/prescriptions",  icon: Pill },
  { title: "Medicine Catalogue",path: "/pharmacy/medicines",      icon: ListChecks },
  { title: "Refill Requests",   path: "/pharmacy/refill-requests",icon: RefreshCw },
  { title: "Profile",           path: "/pharmacy/profile",        icon: User },
];

const PharmacySidebar = () => (
  <PortalSidebar
    portalName="Pharmacy Portal"
    portalSubtitle="Dispense & refill management"
    portalIcon={Pill}
    iconGradient="linear-gradient(135deg,#10B981,#059669)"
    menuItems={menuItems}
  />
);

export default PharmacySidebar;
