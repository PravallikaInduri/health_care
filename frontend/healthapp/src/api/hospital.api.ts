import api from "./axios";

export interface HospitalUnitStat {
  id: string;
  name: string;
  type: "LAB" | "PHARMACY";
  pending: number;
}

export interface HospitalOverview {
  hospital: { id: string; name: string };
  counts: {
    doctors: number;
    labs: number;
    pharmacies: number;
    staff: number;
    departments: number;
    patients: number;
    totalLabReports: number;
    reportsUploadedToday: number;
    pendingReports: number;
    activeLabTechnicians: number;
  };
  units?: HospitalUnitStat[];
  unrouted?: {
    labOrders: number;
    prescriptions: number;
  };
  recentAppointments?: {
    id: string;
    scheduled_at: string;
    status: string;
    patient_name: string;
    doctor_name: string;
  }[];
  recentPatients?: {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
    sex: string | null;
    dob: string | null;
    last_visit: string | null;
  }[];
  departmentStats?: {
    id: string;
    name: string;
    description: string | null;
    doctor_count: number;
    patient_count: number;
  }[];
}

export interface HospitalDoctor {
  id: string;
  name: string;
  specialty: string | null;
  verification_status: string | null;
  consultation_fee: string | number | null;
  video_consultation_fee: string | number | null;
  email: string;
}

export interface HospitalUnit {
  id: string;
  name: string;
  type: "LAB" | "PHARMACY";
  address: string | null;
  phone: string | null;
  staff_count: number;
}

export interface HospitalStaff {
  id: string;
  staff_role: string;
  display_name: string | null;
  created_at: string;
  user_id: string;
  email: string;
  is_active: number;
  unit_id: string;
  unit_name: string;
  unit_type: "LAB" | "PHARMACY";
}

export const getHospitalOverview = () =>
  api.get("/hospital/overview");

export const getHospitalDoctors = (search?: string) =>
  api.get("/hospital/doctors", { params: search ? { search } : {} });

export const updateHospitalDoctorFee = (
  providerId: string,
  fees: { consultation_fee: number; video_consultation_fee: number }
) => api.patch(`/hospital/doctors/${providerId}/fee`, fees);

export const getHospitalUnits = () =>
  api.get("/hospital/units");

export const createHospitalUnit = (data: {
  type: "LAB" | "PHARMACY";
  name: string;
  address?: string;
  phone?: string;
}) => api.post("/hospital/units", data);

export const updateHospitalUnit = (
  id: string,
  data: { name?: string; address?: string; phone?: string }
) => api.patch(`/hospital/units/${id}`, data);

export const deleteHospitalUnit = (id: string) =>
  api.delete(`/hospital/units/${id}`);

export const getHospitalStaff = () =>
  api.get("/hospital/staff");

export const createHospitalStaff = (data: {
  facility_id: string;
  name: string;
  email: string;
  password: string;
}) => api.post("/hospital/staff", data);

export interface HospitalBillingPayment {
  id: string;
  scheduled_at: string | null;
  consultation_fee: string | number | null;
  payment_status: string | null;
  paid_at: string | null;
  provider_name: string | null;
  patient_name: string | null;
  mrn: string | null;
  gateway_txn_id: string | null;
}

export interface HospitalLabPayment {
  id: string;
  paid_at: string | null;
  amount: string | number | null;
  lab_name: string | null;
  patient_name: string | null;
  mrn: string | null;
}

export interface HospitalPharmacyPayment {
  id: string;
  paid_at: string | null;
  amount: string | number | null;
  pharmacy_name: string | null;
  medication_name: string | null;
  patient_name: string | null;
  mrn: string | null;
}

export interface HospitalBilling {
  hospital: { id: string; name: string };
  summary: { collected: number; pending: number; total: number };
  earnings: {
    consultations: number;
    labs: number;
    pharmacy: number;
    total: number;
  };
  payments: HospitalBillingPayment[];
  labPayments: HospitalLabPayment[];
  pharmacyPayments: HospitalPharmacyPayment[];
}

export const getHospitalBilling = () => api.get("/hospital/billing");

export const updateHospitalStaff = (
  id: string,
  data: {
    name?: string;
    password?: string;
    is_active?: boolean;
    facility_id?: string;
  }
) => api.patch(`/hospital/staff/${id}`, data);

export const deleteHospitalStaff = (id: string) =>
  api.delete(`/hospital/staff/${id}`);

/* ── Departments ── */
export interface HospitalDepartment {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_attached: number;   // 1 = attached to this hospital, 0 = not
  status: "ACTIVE" | "INACTIVE";
  doctor_count: number;
  patient_count: number;
}

export const getHospitalDepartments = () =>
  api.get<{ success: boolean; data: { hospital: { id: string; name: string }; departments: HospitalDepartment[] } }>(
    "/hospital/departments"
  );

export const createHospitalDepartment = (data: {
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
}) => api.post("/hospital/departments", data);

export const updateHospitalDepartment = (
  deptId: string,
  data: {
    name?: string;
    description?: string;
    status?: "ACTIVE" | "INACTIVE";
  }
) => api.patch(`/hospital/departments/${deptId}`, data);

export const deleteHospitalDepartment = (deptId: string) =>
  api.delete(`/hospital/departments/${deptId}`);

export const attachHospitalDepartment = (deptId: string) =>
  api.post(`/hospital/departments/${deptId}/attach`);

export const detachHospitalDepartment = (deptId: string) =>
  api.delete(`/hospital/departments/${deptId}/detach`);

/* ── Patients ── */
export interface HospitalPatient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  last_visit: string | null;
  assigned_doctor: string | null;
  department: string | null;
  status: string | null;
}

export const getHospitalPatients = (search?: string) =>
  api.get<{ success: boolean; data: { hospital: { id: string; name: string }; patients: HospitalPatient[] } }>(
    "/hospital/patients",
    { params: search ? { search } : {} }
  );
