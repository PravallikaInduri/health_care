import {
  LayoutDashboard,
  User,
  FileText,
  FlaskConical,
  Shield,
  Users,
  Phone,
  CalendarPlus,
  Pill,
  RefreshCw,
  Building2,
  MessageSquare,
  FolderOpen,
  Receipt,
  HeartPulse,
} from "lucide-react";
import PortalSidebar from "../shared/PortalSidebar";

const menuItems = [
  { title: "Dashboard",         path: "/patient/dashboard",    icon: LayoutDashboard, exact: true },
  { title: "Find a Hospital",   path: "/patient/hospitals",    icon: Building2 },
  { title: "My Appointments",   path: "/patient/appointments", icon: CalendarPlus },
  { title: "Messages",          path: "/patient/messages",     icon: MessageSquare },
  { title: "Encounters",        path: "/patient/encounters",   icon: FileText },
  { title: "Medical Records",   path: "/patient/labs",         icon: FolderOpen },
  { title: "Prescriptions",     path: "/patient/prescriptions",icon: Pill },
  { title: "Refill Requests",   path: "/patient/refill-requests", icon: RefreshCw },
  { title: "Lab Reports",       path: "/patient/labs",         icon: FlaskConical },
  { title: "Documents",         path: "/patient/documents",    icon: FolderOpen },
  { title: "Billing",           path: "/patient/billing",      icon: Receipt },
  { title: "Insurance",         path: "/patient/insurance",    icon: Shield },
  { title: "Dependents",        path: "/patient/dependents",   icon: Users },
  { title: "Emergency Contacts",path: "/patient/emergency",    icon: Phone },
  { title: "Profile",           path: "/patient/profile",      icon: User },
];

const PatientSidebar = () => (
  <PortalSidebar
    portalName="Health Portal"
    portalSubtitle="Your healthcare, in one place"
    portalIcon={HeartPulse}
    iconGradient="linear-gradient(135deg,#0EA5E9,#0284C7)"
    menuItems={menuItems}
  />
);

export default PatientSidebar;
