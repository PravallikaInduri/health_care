import api from "./axios";

export const getPatientProfile = () =>
  api.get("/healthcare/patients/me");

export const updatePatientProfile = (
  data: any
) =>
  api.patch(
    "/healthcare/patients/me",
    data
  );

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PatientEncounter {
  id: string;
  appointment_id: string | null;
  provider_id: string | null;
  patient_id: string;
  started_at: string | null;
  ended_at: string | null;
  chief_complaint: string | null;
  provider_name: string | null;
  provider_specialty: string | null;
  facility_id: string | null;
  facility_name: string | null;
  facility_type: string | null;
  diagnoses: string | null;
}

export interface PatientEncounterDetail extends PatientEncounter {
  vitals: any;
  soap_note: string | null;
  diagnoses_list?: Array<{
    id: string;
    icd10_code: string | null;
    description: string | null;
    is_chronic: number | boolean | null;
  }>;
}

export const getEncounters = (params: {
  search?: string;
  page?: number;
  limit?: number;
} = {}) =>
  api.get<{
    success: boolean;
    data: PatientEncounter[];
    pagination: PaginationMeta;
  }>("/healthcare/patients/me/encounters", { params });

export const getEncounterById = (id: string) =>
  api.get(
    `/healthcare/patients/me/encounters/${id}`
  );

export interface PatientLabReport {
  id: string;
  encounter_id: string | null;
  patient_id: string;
  ordered_at: string | null;
  status: string | null;
  provider_id: string | null;
  provider_name: string | null;
  facility_id: string | null;
  facility_name: string | null;
  result_count: number;
  observed_at: string | null;
}

export interface PatientLabResult {
  id: string;
  test: string | null;
  value: string | null;
  unit: string | null;
  reference_range: string | null;
  flag: "NORMAL" | "LOW" | "HIGH" | "CRITICAL" | null;
  observed_at: string | null;
}

export interface PatientLabTest {
  id: string;
  test_name: string;
  instructions: string | null;
}

export interface PatientLabUpload {
  id: string;
  test_name: string | null;
  file_name: string;
  mime: string | null;
  note: string | null;
  uploaded_at: string | null;
  size_bytes: number | null;
}

export interface PatientLabReportDetail extends PatientLabReport {
  results: PatientLabResult[];
  tests: PatientLabTest[];
  uploads: PatientLabUpload[];
}

export const getLabs = (params: {
  search?: string;
  page?: number;
  limit?: number;
} = {}) =>
  api.get<{
    success: boolean;
    data: PatientLabReport[];
    pagination: PaginationMeta;
  }>("/healthcare/patients/me/labs", { params });

export const getLabReportById = (id: string) =>
  api.get<{
    success: boolean;
    data: PatientLabReportDetail;
  }>(`/healthcare/patients/me/labs/${id}`);

export const uploadLabResult = (
  labOrderId: string,
  file: File,
  meta: { test_name?: string; note?: string } = {}
) => {
  const form = new FormData();
  form.append("file", file);
  if (meta.test_name) form.append("test_name", meta.test_name);
  if (meta.note) form.append("note", meta.note);
  return api.post<{ success: boolean; data: { id: string } }>(
    `/healthcare/patients/me/labs/${labOrderId}/results`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};

/* Open an uploaded lab result in a new tab (auth-guarded blob fetch). */
export const openLabResult = async (resultId: string) => {
  const res = await api.get(
    `/healthcare/patients/me/lab-results/${resultId}/download`,
    { responseType: "blob" }
  );
  const url = window.URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank");
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
};

export interface PatientInsurance {
  id: string;
  patient_id: string;
  payer: string | null;
  member_id: string | null;
  group_no: string | null;
  valid_from: string | null;
  valid_to: string | null;
}

export const getInsurance = () =>
  api.get<{
    success: boolean;
    data: PatientInsurance[];
  }>("/healthcare/patients/me/insurance");

export const updateInsurance = (
  id: string,
  data: Partial<{
    payer: string;
    member_id: string;
    group_no: string | null;
    valid_from: string | null;
    valid_to: string | null;
  }>
) =>
  api.patch(
    `/healthcare/patients/me/insurance/${id}`,
    data
  );

export const deleteInsurance = (id: string) =>
  api.delete(
    `/healthcare/patients/me/insurance/${id}`
  );

export const addEmergencyContact = (
  data: any
) =>
  api.post(
    "/healthcare/patients/me/emergency-contacts",
    data
  );

export interface PatientEmergencyContact {
  id?: string;
  patient_id?: string;
  name: string;
  relationship: string | null;
  phone: string;
}

export const getMyEmergencyContacts = () =>
  api.get<{
    success: boolean;
    data: PatientEmergencyContact[];
  }>("/healthcare/patients/me/emergency-contacts");

export interface PatientDependent {
  id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  relationship: string | null;
  proxy_consent: boolean | number | null;
}

export const getMyDependents = () =>
  api.get<{
    success: boolean;
    data: PatientDependent[];
  }>("/healthcare/patients/me/dependents");

export const addDependent = (
  data: any
) =>
  api.post(
    "/healthcare/patients/me/dependents",
    data
  );

export const addInsurance = (
  data: any
) =>
  api.post(
    "/healthcare/patients/me/insurance",
    data
  );

/* APPOINTMENTS */

export const getBookableProviders = () =>
  api.get("/healthcare/appointments/providers");

export const getProviderFacilities = (
  providerId: string
) =>
  api.get(
    `/healthcare/appointments/providers/${providerId}/facilities`
  );

export const getAvailability = (
  providerId: string,
  date: string
) =>
  api.get(
    `/healthcare/appointments/availability/${providerId}/${date}`
  );

export const bookAppointment = (data: {
  provider_id: string;
  facility_id: string;
  scheduled_at: string;
  duration_min?: number;
  type: "IN_PERSON" | "VIDEO";
  reason?: string;
}) =>
  api.post("/healthcare/appointments", data);

export const getMyAppointments = () =>
  api.get("/healthcare/appointments");

export const cancelAppointment = (id: string) =>
  api.delete(`/healthcare/appointments/${id}`);

/* PRESCRIPTIONS (Sprint 6) */

export type PatientRxStatus = "ACTIVE" | "DISPENSED" | "CANCELLED";

export interface PatientPrescription {
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
  status: PatientRxStatus;
  dispensed_at: string | null;
  medication_name: string | null;
  medication_generic: string | null;
  provider_name: string | null;
}

export const getMyPrescriptions = () =>
  api.get<{
    success: boolean;
    data: PatientPrescription[];
  }>("/healthcare/patients/me/prescriptions");

export const requestRefill = (id: string) =>
  api.post<{
    success: boolean;
    refillRequestId: string;
    message: string;
  }>(`/healthcare/patients/me/prescriptions/${id}/refill`);