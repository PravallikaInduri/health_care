import api from "./axios";

export interface PatientPrescription {
  id: string;
  dose: string | null;
  frequency: string | null;
  duration_days: number | null;
  refills_allowed: number | null;
  refills_used: number | null;
  instructions: string | null;
  prescribed_at: string | null;
  medication_name: string | null;
  generic_name: string | null;
  provider_name: string | null;
  pharmacy_facility_name: string | null;
  last_refill_status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "DISPENSED"
    | null;
}

export interface RefillRequest {
  id: string;
  prescription_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISPENSED";
  requested_at: string;
  decided_at: string | null;
  medication_name: string | null;
}

export interface ProviderRefillRequest extends RefillRequest {
  dose: string | null;
  frequency: string | null;
  refills_allowed: number | null;
  refills_used: number | null;
  patient_name: string | null;
}

/* Patient */
export const getMyPrescriptions = () =>
  api.get<{ success: boolean; data: PatientPrescription[] }>(
    "/healthcare/refills/me/prescriptions"
  );

export const getMyRefills = () =>
  api.get<{ success: boolean; data: RefillRequest[] }>(
    "/healthcare/refills/me"
  );

export const requestRefill = (prescriptionId: string) =>
  api.post<{ success: boolean; data: { id: string } }>(
    "/healthcare/refills",
    { prescription_id: prescriptionId }
  );

/* Provider */
export const getProviderRefills = (status?: string) =>
  api.get<{ success: boolean; data: ProviderRefillRequest[] }>(
    "/healthcare/refills/provider",
    { params: status ? { status } : {} }
  );

export const decideRefill = (
  id: string,
  status: "APPROVED" | "REJECTED"
) =>
  api.patch<{ success: boolean; data: { id: string; status: string } }>(
    `/healthcare/refills/${id}`,
    { status }
  );
