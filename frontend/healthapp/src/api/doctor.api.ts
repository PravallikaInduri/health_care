import api from "./axios";
import type {
  DoctorProfile,
  DoctorAppointment,
  AppointmentStatus,
  ScheduleTemplate,
  CreateScheduleInput,
  ScheduleOverride,
  CreateOverrideInput,
  EncounterInput,
  DiagnosisInput,
  PrescriptionInput,
  LabOrderInput,
  PharmacyFacilityOption,
} from "../types/doctor";

/* PROFILE */

export const getDoctorProfile = async (): Promise<DoctorProfile> => {
  const res = await api.get("/providers/me");
  return res.data;
};

export const updateDoctorProfile = async (
  data: Partial<DoctorProfile>
) => {
  const res = await api.put("/providers/me", data);
  return res.data;
};

/* APPOINTMENTS */

export const getDoctorAppointments = async (): Promise<DoctorAppointment[]> => {
  const res = await api.get("/providers/appointments");
  return res.data?.data ?? [];
};

export const updateAppointmentStatus = async (
  id: string,
  status: AppointmentStatus
) => {
  const res = await api.patch(
    `/providers/appointments/${id}/status`,
    { status }
  );
  return res.data;
};

/* SCHEDULES */

export const getSchedules = async (): Promise<ScheduleTemplate[]> => {
  const res = await api.get("/providers/schedules");
  return res.data;
};

export const createSchedule = async (
  data: CreateScheduleInput
) => {
  const res = await api.post("/providers/schedules", data);
  return res.data;
};

export const deleteSchedule = async (id: string) => {
  const res = await api.delete(`/providers/schedules/${id}`);
  return res.data;
};

/* OVERRIDES */

export const getOverrides = async (): Promise<ScheduleOverride[]> => {
  const res = await api.get("/providers/schedules/overrides");
  return res.data;
};

export const createOverride = async (
  data: CreateOverrideInput
) => {
  const res = await api.post(
    "/providers/schedules/override",
    data
  );
  return res.data;
};

export const deleteOverride = async (id: string) => {
  const res = await api.delete(
    `/providers/schedules/overrides/${id}`
  );
  return res.data;
};

/* CLINICAL */

export const createEncounter = async (
  data: EncounterInput
): Promise<{ message: string; encounterId: string }> => {
  const res = await api.post("/providers/encounters", data);
  return res.data;
};

export const createDiagnosis = async (
  data: DiagnosisInput
) => {
  const res = await api.post("/providers/diagnoses", data);
  return res.data;
};

export const createPrescription = async (
  data: PrescriptionInput
) => {
  const res = await api.post(
    "/providers/prescriptions",
    data
  );
  return res.data;
};

/** Sprint 12 — list pharmacy facilities for the Encounter routing picker. */
export const listPharmacyFacilities = async (): Promise<
  PharmacyFacilityOption[]
> => {
  const res = await api.get("/providers/pharmacies");
  return res.data?.data ?? [];
};

export const createLabOrder = async (
  data: LabOrderInput
) => {
  const res = await api.post("/providers/lab-orders", data);
  return res.data;
};

/* PROVIDER LAB ORDERS DASHBOARD (Sprint 5) */

export interface ProviderLabOrder {
  id: string;
  encounter_id: string;
  patient_id: string;
  ordered_at: string;
  status: string;
  first_name: string;
  last_name: string;
  mrn: string | null;
  result_count: number;
}

export interface ProviderLabResult {
  id: string;
  test: string;
  value: string;
  unit: string | null;
  reference_range: string | null;
  flag: "NORMAL" | "LOW" | "HIGH" | "CRITICAL" | null;
  observed_at: string;
}

export interface ProviderLabOrderDetail extends ProviderLabOrder {
  results: ProviderLabResult[];
  uploads: LabOrderUpload[];
}

export interface LabResultEntry {
  test: string;
  value: string;
  unit?: string;
  reference_range?: string;
  flag?: "NORMAL" | "LOW" | "HIGH" | "CRITICAL" | "";
  observed_at?: string;
}

export const listMyLabOrders = (
  params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}
) =>
  api.get<{
    success: boolean;
    data: ProviderLabOrder[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/providers/lab-orders", { params });

export const getMyLabOrderDetail = (id: string) =>
  api.get<{
    success: boolean;
    data: ProviderLabOrderDetail;
  }>(`/providers/lab-orders/${id}`);

export const submitLabResults = (
  id: string,
  results: LabResultEntry[]
) =>
  api.post<{
    success: boolean;
    inserted: number;
    message: string;
  }>(`/providers/lab-orders/${id}/results`, { results });

/* PROVIDER PRESCRIPTIONS HISTORY (Sprint 6) */

export type ProviderRxStatus =
  | "ACTIVE"
  | "DISPENSED"
  | "CANCELLED";

export interface ProviderPrescription {
  id: string;
  patient_id: string;
  medication_id: string;
  dose: string | null;
  frequency: string | null;
  duration_days: number | null;
  refills_allowed: number;
  refills_used: number;
  instructions: string | null;
  prescribed_at: string;
  status: ProviderRxStatus;
  dispensed_at: string | null;
  first_name: string | null;
  last_name: string | null;
  mrn: string | null;
  medication_name: string | null;
  medication_generic: string | null;
}

export const listProviderPrescriptions = (
  params: {
    search?: string;
    status?: ProviderRxStatus | "";
    page?: number;
    limit?: number;
  } = {}
) =>
  api.get<{
    success: boolean;
    data: ProviderPrescription[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/providers/prescriptions", { params });

/* MY PATIENTS */

export interface ProviderPatient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  appointment_count: number;
  last_visit: string | null;
}

export interface ProviderPatientDocument {
  id: string;
  type: string;
  file_name: string | null;
  mime: string | null;
  uploaded_at: string | null;
  size_bytes: number | null;
}

export interface LabOrderTest {
  id: string;
  test_name: string;
  instructions: string | null;
}

export interface LabOrderUpload {
  id: string;
  test_name: string | null;
  file_name: string;
  mime: string | null;
  note: string | null;
  uploaded_at: string | null;
  size_bytes: number | null;
}

export interface ProviderPatientLabOrder {
  id: string;
  encounter_id: string | null;
  ordered_at: string | null;
  status: string | null;
  facility_name: string | null;
  tests: LabOrderTest[];
  uploads: LabOrderUpload[];
}

export interface ProviderPatientDetail {
  patient: ProviderPatient;
  documents: ProviderPatientDocument[];
  labOrders: ProviderPatientLabOrder[];
}

export const getMyPatients = async (): Promise<ProviderPatient[]> => {
  const res = await api.get("/providers/patients");
  return res.data?.data ?? [];
};

export const getProviderPatientDetail = async (
  patientId: string
): Promise<ProviderPatientDetail> => {
  const res = await api.get(`/providers/patients/${patientId}`);
  return res.data?.data;
};

/* Auth-guarded binary fetches opened in a new tab via object URL. */
export const openProviderPatientDocument = async (
  patientId: string,
  documentId: string
) => {
  const res = await api.get(
    `/providers/patients/${patientId}/documents/${documentId}/download`,
    { responseType: "blob" }
  );
  const url = window.URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank");
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
};

export const openProviderLabResult = async (resultId: string) => {
  const res = await api.get(
    `/providers/lab-results/${resultId}/download`,
    { responseType: "blob" }
  );
  const url = window.URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank");
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
};
