export interface DoctorProfile {
  id: string;
  user_id: string;
  name: string;
  specialty: string | null;
  npi_or_mci: string | null;
  photo_url: string | null;
  bio: string | null;
  languages: string[] | null;
  accepting_new: boolean | number;
  verification_status: "PENDING" | "APPROVED" | "REJECTED";
  is_verified: boolean | number;
}

export type AppointmentStatus =
  | "REQUESTED"
  | "BOOKED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface DoctorAppointment {
  id: string;
  patient_id: string;
  provider_id: string;
  facility_id: string;
  scheduled_at: string;
  duration_min: number;
  type: "IN_PERSON" | "VIDEO";
  status: AppointmentStatus;
  reason: string | null;
  meeting_link: string | null;
  appointment_mode: "IN_PERSON" | "VIDEO";
  first_name: string;
  last_name: string;
  mrn: string | null;
  dob: string | null;
  sex: string | null;
}

export interface ScheduleBlock {
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface ScheduleTemplate {
  id: string;
  provider_id: string;
  template_name: string;
  effective_start_date: string;
  effective_end_date: string | null;
  run_indefinitely: boolean | number;
  appointment_duration: number;
  buffer_time: number;
  allow_in_person: boolean | number;
  allow_video: boolean | number;
  is_active: boolean | number;
  created_at: string;
}

export interface CreateScheduleInput {
  template_name: string;
  effective_start_date: string;
  effective_end_date?: string | null;
  run_indefinitely: boolean;
  appointment_duration: number;
  buffer_time: number;
  allow_in_person: boolean;
  allow_video: boolean;
  blocks: ScheduleBlock[];
}

export type OverrideType = "UNAVAILABLE" | "EXTRA_HOURS";

export interface ScheduleOverride {
  id: string;
  provider_id: string;
  override_type: OverrideType;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  action_for_existing:
    | "AUTO_CANCEL"
    | "WAITLIST"
    | "ROUTE_COLLEAGUE"
    | null;
  colleague_provider_id: string | null;
  created_at: string;
}

export interface CreateOverrideInput {
  override_type: OverrideType;
  start_datetime: string;
  end_datetime: string;
  reason?: string;
  action_for_existing?:
    | "AUTO_CANCEL"
    | "WAITLIST"
    | "ROUTE_COLLEAGUE";
}

export interface EncounterInput {
  appointment_id: string;
  provider_id: string;
  patient_id: string;
  chief_complaint: string;
  vitals: {
    bp?: string;
    temperature?: string;
    pulse?: string;
  };
  soap_note: string;
  billing_codes?: string[];
}

export interface DiagnosisInput {
  encounter_id: string;
  icd10_code: string;
  description: string;
  is_chronic: boolean;
}

export interface PrescriptionInput {
  encounter_id: string;
  patient_id: string;
  medication_id: string;
  dose: string;
  frequency: string;
  duration_days: number;
  refills_allowed?: number;
  instructions: string;
  /** Sprint 12 — pharmacy this prescription should be routed to (required). */
  pharmacy_facility_id: string;
}

export interface PharmacyFacilityOption {
  id: string;
  name: string;
  address: string | null;
}

export interface LabOrderTestInput {
  test_name: string;
  instructions?: string;
}

export interface LabOrderInput {
  encounter_id: string;
  patient_id: string;
  tests: LabOrderTestInput[];
}
