import api from "./axios";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HospitalCardData {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  about: string | null;
  logo_url: string | null;
  cover_url: string | null;
  established_year: number | null;
  type: string;
  doctor_count: number;
  department_count: number;
  avg_rating: number | null;
  review_count: number;
}

export const listHospitals = (params: {
  search?: string;
  city?: string;
  page?: number;
  limit?: number;
}) =>
  api.get<{
    success: boolean;
    data: HospitalCardData[];
    pagination: PaginationMeta;
  }>("/healthcare/appointments/hospitals", { params });

export const getHospitalById = (id: string) =>
  api.get<{ success: boolean; data: HospitalCardData }>(
    `/healthcare/appointments/hospitals/${id}`
  );

export interface DepartmentTileData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  slug: string | null;
  doctor_count: number;
}

export const getHospitalDepartments = (hospitalId: string) =>
  api.get<{ success: boolean; data: DepartmentTileData[] }>(
    `/healthcare/appointments/hospitals/${hospitalId}/departments`
  );

export interface DoctorCardData {
  id: string;
  name: string;
  specialty: string | null;
  photo_url: string | null;
  bio: string | null;
  languages: string | null;
  experience_years: number | null;
  qualifications: string | null;
  consultation_fee: number | null;
  video_consultation_fee: number | null;
  accepting_new: number | boolean;
  avg_rating: number | null;
  review_count: number;
}

export const getDepartmentDoctors = (
  hospitalId: string,
  deptId: string,
  params: { search?: string; page?: number; limit?: number } = {}
) =>
  api.get<{
    success: boolean;
    hospital: HospitalCardData | null;
    department: DepartmentTileData | null;
    data: DoctorCardData[];
    pagination: PaginationMeta;
  }>(
    `/healthcare/appointments/hospitals/${hospitalId}/departments/${deptId}/doctors`,
    { params }
  );

export interface DoctorPublicProfile extends DoctorCardData {
  npi_or_mci: string | null;
  departments: Array<{
    id: string;
    name: string;
    icon: string | null;
    slug: string | null;
  }>;
  facilities: Array<{
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    logo_url: string | null;
  }>;
}

export const getDoctorProfile = (providerId: string) =>
  api.get<{ success: boolean; data: DoctorPublicProfile }>(
    `/healthcare/appointments/doctors/${providerId}`
  );

export interface DoctorReview {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
}

export const listDoctorReviews = (
  providerId: string,
  params: { page?: number; limit?: number } = {}
) =>
  api.get<{
    success: boolean;
    data: DoctorReview[];
    pagination: PaginationMeta;
  }>(`/healthcare/appointments/doctors/${providerId}/reviews`, { params });

export const createDoctorReview = (
  providerId: string,
  rating: number,
  review?: string | null
) =>
  api.post<{
    success: boolean;
    reviewId: string;
    updated: boolean;
  }>(`/healthcare/appointments/doctors/${providerId}/reviews`, {
    rating,
    review,
  });

export interface AvailabilityResponse {
  success: boolean;
  providerId: string;
  facilityId?: string;
  date: string;
  duration: number;
  slots: string[];
  cached?: boolean;
}

export const getAvailability = (
  providerId: string,
  facilityId: string,
  date: string
) =>
  api.get<AvailabilityResponse>(
    `/healthcare/appointments/availability/${providerId}/${facilityId}/${date}`
  );

/* Legacy single-shot booking endpoint (kept for "Quick Book"). */
export const bookAppointment = (data: {
  provider_id: string;
  facility_id: string;
  scheduled_at: string;
  duration_min?: number;
  type?: string;
  reason?: string;
}) => api.post("/healthcare/appointments", data);

/* ----------------------------------------------------------------
   Enterprise booking flow (Sprint 8)
-----------------------------------------------------------------*/

export interface AppointmentDetail {
  id: string;
  patient_id: string;
  provider_id: string;
  facility_id: string;
  scheduled_at: string;
  duration_min: number | null;
  type: string;
  status: string;
  reason: string | null;
  consultation_fee: number | null;
  payment_status: "PENDING" | "PAID" | "REFUNDED" | "FAILED";
  paid_at: string | null;
  payment_id: string | null;
  unavailability_id: string | null;

  provider_name: string;
  provider_specialty: string | null;
  provider_photo: string | null;
  provider_qualifications: string | null;
  provider_fee: number | null;

  facility_name: string | null;
  facility_address: string | null;
  facility_city: string | null;
  facility_phone: string | null;
  facility_logo: string | null;

  first_name: string | null;
  last_name: string | null;

  payment_gateway_status: string | null;
  gateway: string | null;
  gateway_txn_id: string | null;
  payment_amount: number | null;
}

export const draftAppointment = (data: {
  provider_id: string;
  facility_id: string;
  scheduled_at: string;
  duration_min?: number;
  type?: string;
  reason?: string;
}) =>
  api.post<{
    success: boolean;
    appointmentId: string;
    consultation_fee: number;
    status: string;
    payment_status: string;
  }>("/healthcare/appointments/draft", data);

export const payForAppointment = (
  appointmentId: string,
  meta: { gateway?: string; gateway_txn_id?: string } = {}
) =>
  api.post<{
    success: boolean;
    appointmentId: string;
    paymentId: string;
    status: string;
    payment_status: string;
    amount: number;
  }>(`/healthcare/appointments/${appointmentId}/pay`, meta);

export const getAppointmentDetail = (id: string) =>
  api.get<{ success: boolean; data: AppointmentDetail }>(
    `/healthcare/appointments/${id}`
  );

export const cancelAppointment = (
  id: string,
  reason?: string
) =>
  api.post<{
    success: boolean;
    appointmentId: string;
    refund?: boolean;
  }>(`/healthcare/appointments/${id}/cancel`, { reason });

export interface AltSlot {
  date: string;
  time: string;
  scheduled_at: string;
}

export interface AlternativeDoctor {
  id: string;
  name: string;
  specialty: string | null;
  photo_url: string | null;
  experience_years: number | null;
  qualifications: string | null;
  consultation_fee: number | null;
  avg_rating: number | null;
  review_count: number;
  nextSlots: AltSlot[];
}

export const getAlternatives = (id: string) =>
  api.get<{
    success: boolean;
    appointment: AppointmentDetail;
    sameDoctorSlots: AltSlot[];
    alternativeDoctors: AlternativeDoctor[];
  }>(`/healthcare/appointments/${id}/alternatives`);

export const reassignAppointment = (
  id: string,
  data: { scheduled_at: string; provider_id?: string }
) =>
  api.post<{ success: boolean; status: string }>(
    `/healthcare/appointments/${id}/reassign`,
    data
  );

export interface PatientAppointmentRow {
  id: string;
  scheduled_at: string;
  duration_min: number | null;
  type: string;
  status: string;
  consultation_fee: number | null;
  payment_status: string;
  paid_at: string | null;
  unavailability_id: string | null;
  appointment_mode: string | null;
  meeting_link: string | null;
  provider_id: string;
  provider_name: string;
  provider_specialty: string | null;
  provider_photo: string | null;
  facility_id: string | null;
  facility_name: string | null;
  facility_address: string | null;
  facility_city: string | null;
}

export const listMyAppointments = (
  filter: "upcoming" | "completed" | "cancelled" | "all" = "all"
) =>
  api.get<{ success: boolean; data: PatientAppointmentRow[] }>(
    "/healthcare/appointments/my",
    { params: { filter } }
  );
