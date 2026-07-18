import { LayoutDashboard, FlaskConical, ListChecks, User } from "lucide-react";
import PortalSidebar from "../shared/PortalSidebar";

const menuItems = [
  { title: "Dashboard",      path: "/lab/dashboard", icon: LayoutDashboard, exact: true },
  { title: "Lab Orders",     path: "/lab/orders",    icon: FlaskConical },
  { title: "Test Catalogue", path: "/lab/tests",     icon: ListChecks },
  { title: "Profile",        path: "/lab/profile",   icon: User },
];

const LabSidebar = () => (
  <PortalSidebar
    portalName="Lab Portal"
    portalSubtitle="Process orders & upload results"
    portalIcon={FlaskConical}
    iconGradient="linear-gradient(135deg,#14B8A6,#0D9488)"
    menuItems={menuItems}
  />
);

export default LabSidebar;
