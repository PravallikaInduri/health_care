export interface PatientProfile {
  id: string;
  user_id: string;

  first_name: string;
  last_name: string;

  phone: string;
  email: string;

  photo_url: string | null;
}

export interface Encounter {
  id: number;
  patient_id: number;
  started_at: string;
}

export interface LabResult {
  lab_order_id: number;

  status: string;

  ordered_at: string;

  test: string;

  value: string;

  unit: string;

  reference_range: string;

  flag: string;

  observed_at: string;
}