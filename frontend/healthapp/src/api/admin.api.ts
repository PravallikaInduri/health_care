import api from "./axios";

export interface AdminStats {
  pendingDoctors: number;
  approvedDoctors: number;
  totalPatients: number;
  facilities: number;
  facilityBreakdown?: {
    hospitals: number;
    clinics: number;
    labs: number;
  };
  /** Sprint 12 — clinical workload queues */
  pendingPrescriptions?: number;
  pendingRefills?: number;
  pendingLabOrders?: number;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  patient_id: string | null;
  ip: string | null;
  user_agent: string | null;
  success: number | boolean | null;
  reason: string | null;
  occurred_at: string;
  actor_email: string | null;
  patient_name: string | null;
}

export interface AuditLogFilters {
  actorId?: string;
  patientId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const getAdminStats = () =>
  api.get("/admin/stats");

export const getAuditLogs = (
  filters: AuditLogFilters = {}
) =>
  api.get("/admin/audit-logs", {
    params: filters,
  });

export const getPendingDoctors = () =>
  api.get("/admin/doctors/pending");

export const getDoctorById = (
  id: string
) =>
  api.get(
    `/admin/doctors/${id}`
  );

export const approveDoctor = (
  id: string
) =>
  api.patch(
    `/admin/doctors/${id}/approve`
  );

export const rejectDoctor = (
  id: string,
  reason: string
) =>
  api.patch(
    `/admin/doctors/${id}/reject`,
    {
      reason,
    }
  );

export const getDoctorDocument = (id: string) =>
  api.get(`/admin/doctors/${id}/document`, {
    responseType: "blob",
  });


/* ------------------------------------------------------------------
   SPRINT 9 — Hospital registration verification
-------------------------------------------------------------------*/

export const getPendingHospitals = () =>
  api.get("/admin/hospitals/pending");

export const approveHospital = (
  id: string
) =>
  api.patch(
    `/admin/hospitals/${id}/approve`
  );

export const rejectHospital = (
  id: string,
  reason: string
) =>
  api.patch(
    `/admin/hospitals/${id}/reject`,
    { reason }
  );

export const getHospitalDocument = (id: string) =>
  api.get(`/admin/hospitals/${id}/document`, {
    responseType: "blob",
  });


/* ------------------------------------------------------------------
   SPRINT 2 — Admin directory & detail
-------------------------------------------------------------------*/

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminDoctor {
  id: string;
  name: string;
  specialty: string | null;
  verification_status: "PENDING" | "APPROVED" | "REJECTED";
  is_verified: number | boolean;
  accepting_new: number | boolean;
  photo_url: string | null;
  npi_or_mci: string | null;
  email: string;
  approval_status: string | null;
  created_at: string;
}

export interface ListDoctorsParams {
  search?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  specialty?: string;
  page?: number;
  limit?: number;
  sortBy?: "name" | "specialty" | "status" | "created_at" | "email";
  sortDir?: "asc" | "desc";
}

export const listDoctors = (
  params: ListDoctorsParams = {}
) =>
  api.get<{
    success: boolean;
    data: AdminDoctor[];
    pagination: PaginationMeta;
  }>("/admin/doctors", { params });

export interface AdminPatient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string;
  sex: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface ListPatientsParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "name" | "mrn" | "dob" | "created_at";
  sortDir?: "asc" | "desc";
}

export const listPatients = (
  params: ListPatientsParams = {}
) =>
  api.get<{
    success: boolean;
    data: AdminPatient[];
    pagination: PaginationMeta;
  }>("/admin/patients", { params });

export interface AdminPatientAppointment {
  id: string;
  scheduled_at: string;
  duration_min: number;
  type: string;
  status: string;
  reason: string | null;
  appointment_mode: string | null;
  meeting_link: string | null;
  provider_id: string;
  provider_name: string | null;
  provider_specialty: string | null;
  facility_id: string | null;
  facility_name: string | null;
}

export interface AdminPatientInsurance {
  id: string;
  patient_id: string;
  payer: string;
  member_id: string;
  group_no: string | null;
  valid_from: string | null;
  valid_to: string | null;
  created_at?: string;
}

export interface AdminPatientDependent {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  relationship: string;
  proxy_consent: number | boolean;
  created_at?: string;
}

export interface AdminEmergencyContact {
  id?: string;
  patient_id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface AdminPatientFullProfile {
  profile: AdminPatient & {
    user_id: string | null;
    is_active?: number | boolean | null;
    account_email?: string | null;
    account_created_at?: string | null;
  };
  appointments: AdminPatientAppointment[];
  insurance: AdminPatientInsurance[];
  dependents: AdminPatientDependent[];
  emergencyContacts: AdminEmergencyContact[];
}

export const getPatientFullProfile = (
  id: string
) =>
  api.get<{
    success: boolean;
    data: AdminPatientFullProfile;
  }>(`/admin/patients/${id}`);

export interface AdminScheduleBlock {
  id: string;
  template_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface AdminScheduleTemplate {
  id: string;
  provider_id: string;
  template_name: string;
  effective_start_date: string;
  effective_end_date: string | null;
  run_indefinitely: number | boolean;
  appointment_duration: number;
  buffer_time: number;
  allow_in_person: number | boolean;
  allow_video: number | boolean;
  is_active: number | boolean;
  created_at: string;
  blocks: AdminScheduleBlock[];
}

export interface AdminScheduleOverride {
  id: string;
  provider_id: string;
  override_type: "UNAVAILABLE" | "EXTRA_HOURS";
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  action_for_existing: string | null;
  colleague_provider_id: string | null;
  created_at: string;
}

export interface AdminAvailabilityDay {
  date: string;
  weekday: number;
  slotsCount: number;
}

export interface AdminDoctorSchedule {
  provider: {
    id: string;
    name: string;
    specialty: string | null;
    verification_status: string;
    accepting_new: number | boolean;
    email: string;
  };
  templates: AdminScheduleTemplate[];
  overrides: AdminScheduleOverride[];
  availabilitySummary: AdminAvailabilityDay[];
}

export const getDoctorSchedule = (
  id: string
) =>
  api.get<{
    success: boolean;
    data: AdminDoctorSchedule;
  }>(`/admin/doctors/${id}/schedule`);


/* ------------------------------------------------------------------
   SPRINT 3 — Facility management
-------------------------------------------------------------------*/

export type FacilityType = "HOSPITAL" | "CLINIC" | "LAB";

export interface AdminFacility {
  id: string;
  name: string;
  type: FacilityType;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  provider_count?: number;
}

export interface ListFacilitiesParams {
  search?: string;
  type?: FacilityType | "";
  page?: number;
  limit?: number;
  sortBy?: "name" | "type";
  sortDir?: "asc" | "desc";
}

export interface FacilityInput {
  name: string;
  type: FacilityType;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
}

export const listFacilities = (
  params: ListFacilitiesParams = {}
) =>
  api.get<{
    success: boolean;
    data: AdminFacility[];
    pagination: PaginationMeta;
  }>("/admin/facilities", { params });

export const getFacilityById = (id: string) =>
  api.get<{
    success: boolean;
    data: AdminFacility;
  }>(`/admin/facilities/${id}`);

export interface FacilityProvider {
  id: string;
  name: string;
  specialty: string | null;
  verification_status: string;
  is_verified: number | boolean;
  accepting_new: number | boolean;
  photo_url: string | null;
  email: string;
}

export const getFacilityWithProviders = (id: string) =>
  api.get<{
    success: boolean;
    data: {
      facility: AdminFacility;
      providers: FacilityProvider[];
    };
  }>(`/admin/facilities/${id}/providers`);

export interface AssignableProvider {
  id: string;
  name: string;
  specialty: string | null;
  photo_url: string | null;
  email: string;
}

export const getAssignableProvidersForFacility = (
  facilityId: string
) =>
  api.get<{
    success: boolean;
    data: { providers: AssignableProvider[] };
  }>(`/admin/facilities/${facilityId}/assignable-providers`);

export const createFacility = (
  payload: FacilityInput
) =>
  api.post<{
    success: boolean;
    data: AdminFacility;
  }>("/admin/facilities", payload);

export const updateFacility = (
  id: string,
  payload: Partial<FacilityInput>
) =>
  api.put<{
    success: boolean;
    data: AdminFacility;
  }>(`/admin/facilities/${id}`, payload);

export const deleteFacility = (id: string) =>
  api.delete<{
    success: boolean;
    message: string;
  }>(`/admin/facilities/${id}`);

/* Provider <-> Facility assignment (admin) */

export const listProviderFacilitiesAdmin = (
  providerId: string
) =>
  api.get<{
    success: boolean;
    count: number;
    data: AdminFacility[];
  }>(`/admin/providers/${providerId}/facilities`);

export const assignFacilityToProvider = (
  providerId: string,
  facilityId: string
) =>
  api.post<{
    success: boolean;
    message: string;
  }>(`/admin/providers/${providerId}/facilities`, {
    facility_id: facilityId
  });

export const removeFacilityFromProvider = (
  providerId: string,
  facilityId: string
) =>
  api.delete<{
    success: boolean;
    message: string;
  }>(
    `/admin/providers/${providerId}/facilities/${facilityId}`
  );

/* ================================================================
   DEPARTMENT MANAGEMENT (Sprint 7)
=================================================================*/

export interface AdminDepartment {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  slug: string | null;
  facility_count?: number;
  provider_count?: number;
}

export interface DepartmentInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  slug?: string | null;
}

export const listDepartments = (search?: string) =>
  api.get<{ success: boolean; data: AdminDepartment[] }>(
    "/admin/departments",
    { params: search ? { search } : {} }
  );

export const getDepartmentById = (id: string) =>
  api.get<{ success: boolean; data: AdminDepartment }>(
    `/admin/departments/${id}`
  );

export const createDepartment = (payload: DepartmentInput) =>
  api.post<{
    success: boolean;
    data: { id: string; name: string; slug: string };
  }>("/admin/departments", payload);

export const updateDepartment = (
  id: string,
  payload: Partial<DepartmentInput>
) =>
  api.put<{ success: boolean }>(
    `/admin/departments/${id}`,
    payload
  );

export const deleteDepartment = (id: string) =>
  api.delete<{ success: boolean; message: string }>(
    `/admin/departments/${id}`
  );

/* ============ Facility ↔ Department ============ */

export interface DepartmentFacility {
  id: string;
  name: string;
  type: FacilityType;
  address: string | null;
}

export const listFacilityDepartments = (facilityId: string) =>
  api.get<{ success: boolean; data: AdminDepartment[] }>(
    `/admin/facilities/${facilityId}/departments`
  );

export const listDepartmentFacilities = (departmentId: string) =>
  api.get<{ success: boolean; data: DepartmentFacility[] }>(
    `/admin/departments/${departmentId}/facilities`
  );

export const attachDepartmentToFacility = (
  facilityId: string,
  departmentId: string
) =>
  api.post<{ success: boolean; message: string }>(
    `/admin/facilities/${facilityId}/departments`,
    { department_id: departmentId }
  );

export const detachDepartmentFromFacility = (
  facilityId: string,
  departmentId: string
) =>
  api.delete<{ success: boolean; message: string }>(
    `/admin/facilities/${facilityId}/departments/${departmentId}`
  );

/* ============ Provider ↔ Department ============ */

export const listProviderDepartments = (providerId: string) =>
  api.get<{ success: boolean; data: AdminDepartment[] }>(
    `/admin/providers/${providerId}/departments`
  );

export const attachDepartmentToProvider = (
  providerId: string,
  departmentId: string
) =>
  api.post<{ success: boolean; message: string }>(
    `/admin/providers/${providerId}/departments`,
    { department_id: departmentId }
  );

export const detachDepartmentFromProvider = (
  providerId: string,
  departmentId: string
) =>
  api.delete<{ success: boolean; message: string }>(
    `/admin/providers/${providerId}/departments/${departmentId}`
  );

/* ================================================================
   DOCTOR UNAVAILABILITY (Sprint 8)
=================================================================*/

export interface UnavailabilityRow {
  id: string;
  provider_id: string;
  provider_name: string;
  specialty: string | null;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  action_for_existing: "AUTO_CANCEL" | "WAITLIST" | "ROUTE_COLLEAGUE";
  colleague_provider_id: string | null;
  created_at: string;
  pending_count: number;
  total_affected: number;
}

export interface AffectedAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  payment_status: string;
  consultation_fee: number | null;
  first_name: string | null;
  last_name: string | null;
  patient_email: string;
  provider_name: string;
  facility_name: string | null;
}

export interface MarkUnavailableInput {
  start_datetime: string;
  end_datetime: string;
  reason?: string | null;
  action_for_existing?: "AUTO_CANCEL" | "WAITLIST" | "ROUTE_COLLEAGUE";
  colleague_provider_id?: string | null;
}

export const markProviderUnavailable = (
  providerId: string,
  payload: MarkUnavailableInput
) =>
  api.post<{
    success: boolean;
    overrideId: string;
    affectedCount: number;
  }>(`/admin/providers/${providerId}/unavailability`, payload);

export const listUnavailabilities = () =>
  api.get<{ success: boolean; data: UnavailabilityRow[] }>(
    "/admin/unavailability"
  );

export const listAffectedAppointmentsAdmin = (
  overrideId: string
) =>
  api.get<{ success: boolean; data: AffectedAppointment[] }>(
    `/admin/appointments/affected/${overrideId}`
  );