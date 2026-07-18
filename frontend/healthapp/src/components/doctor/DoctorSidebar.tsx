import {
  LayoutDashboard,
  User,
  CalendarDays,
  Clock,
  Stethoscope,
  Beaker,
  Pill,
  MessageSquare,
  Users,
} from "lucide-react";
import PortalSidebar from "../shared/PortalSidebar";

const menuItems = [
  { title: "Dashboard",      path: "/doctor/dashboard",      icon: LayoutDashboard, exact: true },
  { title: "Profile",        path: "/doctor/profile",        icon: User },
  { title: "Appointments",   path: "/doctor/appointments",   icon: CalendarDays },
  { title: "Schedule",       path: "/doctor/schedule",       icon: Clock },
  { title: "Encounter",      path: "/doctor/encounter",      icon: Stethoscope },
  { title: "Lab Orders",     path: "/doctor/lab-orders",     icon: Beaker },
  { title: "Prescriptions",  path: "/doctor/prescriptions",  icon: Pill },
  { title: "My Patients",    path: "/doctor/patients",       icon: Users },
  { title: "Messages",       path: "/doctor/messages",       icon: MessageSquare },
  { title: "Refill Requests",path: "/doctor/refill-requests",icon: Pill },
];

const DoctorSidebar = () => (
  <PortalSidebar
    portalName="Doctor Portal"
    portalSubtitle="Care delivery & clinical tools"
    portalIcon={Stethoscope}
    iconGradient="linear-gradient(135deg,#0EA5E9,#0284C7)"
    menuItems={menuItems}
  />
);

export default DoctorSidebar;
