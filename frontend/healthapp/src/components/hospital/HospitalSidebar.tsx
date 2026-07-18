import {
  LayoutDashboard,
  Stethoscope,
  FlaskConical,
  Users,
  Receipt,
  FolderOpen,
  Building2,
} from "lucide-react";
import PortalSidebar from "../shared/PortalSidebar";

const menuItems = [
  { title: "Dashboard",         path: "/hospital/dashboard",   icon: LayoutDashboard, exact: true },
  { title: "Departments",       path: "/hospital/departments", icon: FolderOpen },
  { title: "Patients",          path: "/hospital/patients",    icon: Users },
  { title: "Doctors",           path: "/hospital/doctors",     icon: Stethoscope },
  { title: "Labs & Pharmacies", path: "/hospital/units",       icon: FlaskConical },
  { title: "Staff",             path: "/hospital/staff",       icon: Building2 },
  { title: "Billing",           path: "/hospital/billing",     icon: Receipt },
];

const HospitalSidebar = () => (
  <PortalSidebar
    portalName="Hospital Portal"
    portalSubtitle="Manage your hospital"
    portalIcon={Building2}
    iconGradient="linear-gradient(135deg,#0EA5E9,#0284C7)"
    menuItems={menuItems}
  />
);

export default HospitalSidebar;
