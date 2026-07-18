import {
  LayoutDashboard,
  Stethoscope,
  UserCheck,
  Users,
  Building2,
  Hospital,
  Layers,
  ClipboardList,
  CalendarOff,
  ShieldCheck,
} from "lucide-react";
import PortalSidebar from "../shared/PortalSidebar";

const menuItems = [
  { title: "Dashboard",         path: "/admin",                    icon: LayoutDashboard, exact: true },
  { title: "Doctors",           path: "/admin/doctors",            icon: Stethoscope },
  { title: "Pending Doctors",   path: "/admin/pending-doctors",    icon: UserCheck },
  { title: "Pending Hospitals", path: "/admin/pending-hospitals",  icon: Hospital },
  { title: "Patients",          path: "/admin/patients",           icon: Users },
  { title: "Facilities",        path: "/admin/facilities",         icon: Building2 },
  { title: "Departments",       path: "/admin/departments",        icon: Layers },
  { title: "Unavailability",    path: "/admin/unavailability",     icon: CalendarOff },
  { title: "Audit Logs",        path: "/admin/audit-logs",         icon: ClipboardList },
];

const AdminSidebar = () => (
  <PortalSidebar
    portalName="HealthAdmin"
    portalSubtitle="Operations portal"
    portalIcon={ShieldCheck}
    iconGradient="linear-gradient(135deg,#0EA5E9,#0284C7)"
    menuItems={menuItems}
  />
);

export default AdminSidebar;
