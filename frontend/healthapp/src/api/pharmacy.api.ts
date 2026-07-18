import api from "./axios";

export interface PharmacyStats {
  totalPrescriptions: number;
  pendingPrescriptions: number;
  dispensedToday: number;
  pendingRefills: number;
  /** Sprint 12 — false when the user has no facility_staff assignment yet */
  assigned: boolean;
}

export interface PharmacyFacility {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  /** Best-effort hospital affiliation inferred from the pharmacy name prefix. */
  hospital_name: string | null;
}

export interface PharmacyMe {
  id: string;
  email: string;
  role: string;
  approval_status: string | null;
  is_active: number | boolean;
  created_at: string;
  /** Sprint 12 — the pharmacy facilities this user is assigned to. */
  facilities: PharmacyFacility[];
  primaryFacility: PharmacyFacility | null;
}

export type RxStatus = "ACTIVE" | "DISPENSED" | "CANCELLED";

export interface Prescription {
  id: string;
  encounter_id: string | null;
  patient_id: string;
  medication_id: string;
  dose: string | null;
  frequency: string | null;
  duration_days: number | null;
  refills_allowed: number;
  refills_used: number;
  instructions: string | null;
  prescribed_at: string;
  status: RxStatus;
  amount: number | string | null;
  payment_status: "UNPAID" | "PAID";
  paid_at: string | null;
  price: number | null;
  dispensed_at: string | null;
  dispensed_by: string | null;
  first_name: string | null;
  last_name: string | null;
  mrn: string | null;
  medication_name: string | null;
  medication_generic: string | null;
  provider_id: string | null;
  provider_name: string | null;
}

export interface RefillEntry {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface PrescriptionDetail extends Prescription {
  refills: RefillEntry[];
}

export interface RefillRequest {
  id: string;
  prescription_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISPENSED";
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  patient_id: string;
  medication_id: string;
  dose: string | null;
  frequency: string | null;
  refills_allowed: number;
  refills_used: number;
  first_name: string | null;
  last_name: string | null;
  mrn: string | null;
  medication_name: string | null;
  medication_generic: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const registerPharmacyAccount = (data: {
  email: string;
  password: string;
  name?: string;
}) => api.post("/auth/register/pharmacy", data);

export const getPharmacyMe = () =>
  api.get<{ success: boolean; data: PharmacyMe }>(
    "/pharmacy/me"
  );

export const getPharmacyStats = () =>
  api.get<{ success: boolean; data: PharmacyStats }>(
    "/pharmacy/stats"
  );

export const listPharmacyPrescriptions = (
  params: {
    search?: string;
    status?: RxStatus | "";
    page?: number;
    limit?: number;
  } = {}
) =>
  api.get<{
    success: boolean;
    data: Prescription[];
    pagination: PaginationMeta;
  }>("/pharmacy/prescriptions", { params });

export const getPharmacyPrescription = (id: string) =>
  api.get<{ success: boolean; data: PrescriptionDetail }>(
    `/pharmacy/prescriptions/${id}`
  );

export const dispensePrescription = (id: string) =>
  api.post<{ success: boolean; status: RxStatus; message: string }>(
    `/pharmacy/prescriptions/${id}/dispense`
  );

export const listRefillRequests = (
  params: {
    search?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "DISPENSED" | "";
    page?: number;
    limit?: number;
  } = {}
) =>
  api.get<{
    success: boolean;
    data: RefillRequest[];
    pagination: PaginationMeta;
  }>("/pharmacy/refill-requests", { params });

export const dispenseRefillRequest = (id: string) =>
  api.post<{ success: boolean; status: string; message: string }>(
    `/pharmacy/refill-requests/${id}/dispense`
  );

export const markPrescriptionPaid = (id: string) =>
  api.post<{ success: boolean; amount: number; message: string }>(
    `/pharmacy/prescriptions/${id}/paid`
  );

export const searchMedications = (q: string) =>
  api.get<{ success: boolean; data: { id: string; name: string }[] }>(
    "/pharmacy/medications",
    { params: { q } }
  );

/* Pharmacy medicine catalogue (per-facility prices) */
export interface PharmacyMedicine {
  id: string;
  medication_id: string;
  price: number | string;
  quantity: number;
  is_active: 0 | 1 | boolean;
  created_at: string;
  medication_name: string | null;
  medication_generic: string | null;
}

export const getPharmacyMedicines = () =>
  api.get<{ success: boolean; data: PharmacyMedicine[] }>(
    "/pharmacy/medicines"
  );

export const addPharmacyMedicine = (payload: {
  name: string;
  price: number;
  quantity: number;
}) => api.post("/pharmacy/medicines", payload);

export const updatePharmacyMedicine = (
  id: string,
  payload: { price?: number; quantity?: number; is_active?: boolean }
) => api.patch(`/pharmacy/medicines/${id}`, payload);

export const deletePharmacyMedicine = (id: string) =>
  api.delete(`/pharmacy/medicines/${id}`);
