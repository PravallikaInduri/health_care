import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

import Home from "../pages/Home";
import About from "../pages/About";
import Services from "../pages/Services";
import Contact from "../pages/Contact";
import Register from "../pages/auth/Register";
import PatientRegister from "../pages/auth/PatientRegister";
import DoctorRegister from "../pages/auth/DoctorRegister";
import HospitalRegister from "../pages/auth/HospitalRegister";
import Login from "../pages/auth/Login";
import OtpVerification from "../pages/auth/OtpVerification";

import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import PendingDoctors from "../pages/admin/PendingDoctors";
import PendingHospitals from "../pages/admin/PendingHospitals";
import DoctorDetails from "../pages/admin/DoctorDetails";
import DoctorsDirectory from "../pages/admin/DoctorsDirectory";
import PatientsDirectory from "../pages/admin/PatientsDirectory";
import PatientDetail from "../pages/admin/PatientDetail";
import AdminDoctorSchedule from "../pages/admin/DoctorSchedule";
import AdminAuditLogs from "../pages/admin/AuditLogs";
import Facilities from "../pages/admin/Facilities";
import FacilityDetail from "../pages/admin/FacilityDetail";
import AdminDepartments from "../pages/admin/Departments";
import AdminUnavailability from "../pages/admin/Unavailability";

import VerificationPending from "../pages/doctor/VerificationPending";
import ProtectedRoute from "./ProtectedRoute";
import PatientDashboard from "../pages/patient/Dashboard";
import PatientLayout from "../layouts/PatientLayout";
import Profile from "../pages/patient/Profile";
import EmergencyContacts from "../pages/patient/EmergencyContacts";
import Dependents from "../pages/patient/Dependents";
import BookAppointment from "../pages/patient/BookAppointment";
import Encounters from "../pages/patient/Encounters";
import LabReports from "../pages/patient/LabReports";
import Insurance from "../pages/patient/Insurance";
import PatientMessages from "../pages/patient/Messages";
import Documents from "../pages/patient/Documents";
import Prescriptions from "../pages/patient/Prescriptions";
import PatientRefillRequests from "../pages/patient/RefillRequests";
import Billing from "../pages/patient/Billing";
import ForgotPassword from "../pages/auth/ForgotPassword";
import DoctorLayout from "../layouts/DoctorLayout";
import DoctorDashboard from "../pages/doctor/Dashboard";
import DoctorProfile from "../pages/doctor/Profile";
import DoctorAppointments from "../pages/doctor/Appointments";
import DoctorSchedule from "../pages/doctor/Schedule";
import DoctorEncounter from "../pages/doctor/Encounter";
import DoctorLabOrders from "../pages/doctor/LabOrders";
import DoctorPrescriptions from "../pages/doctor/Prescriptions";
import DoctorPatients from "../pages/doctor/Patients";
import DoctorMessages from "../pages/doctor/Messages";
import RefillRequests from "../pages/doctor/RefillRequests";

/* Hospital booking flow (Sprint 7) */
import Hospitals from "../pages/patient/Hospitals";
import HospitalDetail from "../pages/patient/HospitalDetail";
import DepartmentDoctors from "../pages/patient/DepartmentDoctors";
import PatientDoctorProfile from "../pages/patient/DoctorProfile";
import BookSlot from "../pages/patient/BookSlot";

/* Enterprise booking (Sprint 8) */
import AppointmentReview from "../pages/patient/AppointmentReview";
import PatientAppointments from "../pages/patient/Appointments";
import AppointmentAlternatives from "../pages/patient/AppointmentAlternatives";

/* Pharmacy area (Sprint 6) */
import PharmacyLayout from "../layouts/PharmacyLayout";
import PharmacyDashboard from "../pages/pharmacy/Dashboard";
import PharmacyPrescriptions from "../pages/pharmacy/Prescriptions";
import PharmacyPrescriptionDetail from "../pages/pharmacy/PrescriptionDetail";
import PharmacyMedicines from "../pages/pharmacy/Medicines";
import PharmacyRefillRequests from "../pages/pharmacy/RefillRequests";
import PharmacyProfile from "../pages/pharmacy/Profile";
import PharmacyRegister from "../pages/auth/PharmacyRegister";

/* Hospital portal (Sprint 9) */
import HospitalLayout from "../layouts/HospitalLayout";
import HospitalDashboard from "../pages/hospital/Dashboard";
import HospitalDoctors from "../pages/hospital/Doctors";
import HospitalUnits from "../pages/hospital/Units";
import HospitalStaff from "../pages/hospital/Staff";
import HospitalBilling from "../pages/hospital/Billing";
import HospitalDepartments from "../pages/hospital/Departments";
import HospitalPatients from "../pages/hospital/Patients";

/* Lab portal (Sprint 9/11) */
import LabLayout from "../layouts/LabLayout";
import LabDashboard from "../pages/lab/Dashboard";
import LabOrders from "../pages/lab/Orders";
import LabTests from "../pages/lab/Tests";
import LabProfile from "../pages/lab/Profile";


const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      <Route path="/register" element={<Register />} />
      <Route path="/register/patient" element={<PatientRegister />} />
      <Route path="/register/doctor" element={<DoctorRegister />} />
      <Route path="/register/hospital" element={<HospitalRegister />} />
      <Route path="/register/pharmacy" element={<PharmacyRegister />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-otp" element={<OtpVerification />} />
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/doctor/pending"
        element={<VerificationPending />}
      />

      {/* Admin area — sidebar + topbar shared via AdminLayout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="doctors"
          element={<DoctorsDirectory />}
        />
        <Route
          path="doctors/:id"
          element={<DoctorDetails />}
        />
        <Route
          path="doctors/:id/schedule"
          element={<AdminDoctorSchedule />}
        />
        <Route
          path="pending-doctors"
          element={<PendingDoctors />}
        />
        <Route
          path="pending-hospitals"
          element={<PendingHospitals />}
        />
        <Route
          path="patients"
          element={<PatientsDirectory />}
        />
        <Route
          path="patients/:id"
          element={<PatientDetail />}
        />
        <Route
          path="facilities"
          element={<Facilities />}
        />
        <Route
          path="facilities/:id"
          element={<FacilityDetail />}
        />
        <Route
          path="departments"
          element={<AdminDepartments />}
        />
        <Route
          path="unavailability"
          element={<AdminUnavailability />}
        />
        <Route
          path="audit-logs"
          element={<AdminAuditLogs />}
        />
      </Route>

      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={["PROVIDER"]}>
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={<DoctorDashboard />}
        />
        <Route
          path="profile"
          element={<DoctorProfile />}
        />
        <Route
          path="appointments"
          element={<DoctorAppointments />}
        />
        <Route
          path="schedule"
          element={<DoctorSchedule />}
        />
        <Route
          path="encounter"
          element={<DoctorEncounter />}
        />
        <Route
          path="lab-orders"
          element={<DoctorLabOrders />}
        />
        <Route
          path="prescriptions"
          element={<DoctorPrescriptions />}
        />
        <Route
          path="patients"
          element={<DoctorPatients />}
        />
        <Route
          path="messages"
          element={<DoctorMessages />}
        />
        <Route
          path="refill-requests"
          element={<RefillRequests />}
        />
      </Route>

      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={<PatientDashboard />}
        />
        <Route
          path="profile"
          element={<Profile />}
        />
        <Route
          path="book-appointment"
          element={<BookAppointment />}
        />
        {/* Hospital booking flow (Sprint 7) */}
        <Route path="hospitals" element={<Hospitals />} />
        <Route
          path="hospitals/:id"
          element={<HospitalDetail />}
        />
        <Route
          path="hospitals/:id/departments/:deptId"
          element={<DepartmentDoctors />}
        />
        <Route
          path="hospitals/:id/doctors/:providerId"
          element={<PatientDoctorProfile />}
        />
        <Route
          path="hospitals/:id/doctors/:providerId/book"
          element={<BookSlot />}
        />
        {/* Enterprise booking (Sprint 8) */}
        <Route
          path="appointments"
          element={<PatientAppointments />}
        />
        <Route
          path="appointments/:id/review"
          element={<AppointmentReview />}
        />
        <Route
          path="appointments/:id/alternatives"
          element={<AppointmentAlternatives />}
        />
        <Route
          path="messages"
          element={<PatientMessages />}
        />
        <Route
          path="encounters"
          element={<Encounters />}
        />
        <Route
          path="prescriptions"
          element={<Prescriptions />}
        />
        <Route
          path="refill-requests"
          element={<PatientRefillRequests />}
        />
        <Route
          path="labs"
          element={<LabReports />}
        />
        <Route
          path="documents"
          element={<Documents />}
        />
        <Route
          path="billing"
          element={<Billing />}
        />
        <Route
          path="insurance"
          element={<Insurance />}
        />
        <Route
          path="dependents"
          element={<Dependents />}
        />
        <Route
          path="emergency"
          element={<EmergencyContacts />}
        />
      </Route>

      {/* Pharmacy area (Sprint 6) */}
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute allowedRoles={["PHARMACY"]}>
            <PharmacyLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={<PharmacyDashboard />}
        />
        <Route
          path="prescriptions"
          element={<PharmacyPrescriptions />}
        />
        <Route
          path="prescriptions/:id"
          element={<PharmacyPrescriptionDetail />}
        />
        <Route
          path="medicines"
          element={<PharmacyMedicines />}
        />
        <Route
          path="refill-requests"
          element={<PharmacyRefillRequests />}
        />
        <Route
          path="profile"
          element={<PharmacyProfile />}
        />
      </Route>

      {/* Hospital portal (Sprint 9) */}
      <Route
        path="/hospital"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN"]}>
            <HospitalLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={<HospitalDashboard />}
        />
        <Route
          path="doctors"
          element={<HospitalDoctors />}
        />
        <Route
          path="units"
          element={<HospitalUnits />}
        />
        <Route
          path="staff"
          element={<HospitalStaff />}
        />
        <Route
          path="billing"
          element={<HospitalBilling />}
        />
        <Route
          path="departments"
          element={<HospitalDepartments />}
        />
        <Route
          path="patients"
          element={<HospitalPatients />}
        />
      </Route>

      {/* Lab portal (Sprint 9/11) */}
      <Route
        path="/lab"
        element={
          <ProtectedRoute allowedRoles={["LAB_TECH", "LAB_ADMIN"]}>
            <LabLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={<LabDashboard />}
        />
        <Route
          path="orders"
          element={<LabOrders />}
        />
        <Route
          path="tests"
          element={<LabTests />}
        />
        <Route
          path="profile"
          element={<LabProfile />}
        />
      </Route>

    </Routes>
  );
};

export default AppRoutes;
