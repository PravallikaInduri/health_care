import api from "./axios";

export type LabReportStatus =
  | "PENDING"
  | "SAMPLE_COLLECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "UPLOADED";

export interface LabReport {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  encounter_id: string | null;
  lab_test_id: string | null;
  lab_order_id: string | null;
  uploaded_by: string;
  report_name: string;
  report_file_url: string | null;
  remarks: string | null;
  status: LabReportStatus;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
  test_name: string | null;
  hospital_name: string | null;
  uploaded_by_email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface LabReportStats {
  totalTests: number;
  pendingReports: number;
  completedReports: number;
  uploadedToday: number;
  patientsTested: number;
}

export const getLabReportStats = () =>
  api.get<{ success: boolean; data: LabReportStats }>("/lab-reports/stats");

export const uploadLabReport = (
  file: File,
  data: {
    lab_order_id?: string;
    patient_id?: string;
    appointment_id?: string;
    encounter_id?: string;
    lab_test_id?: string;
    report_name?: string;
    remarks?: string;
    status?: LabReportStatus;
  }
) => {
  const form = new FormData();
  form.append("file", file);
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== "") form.append(key, value);
  });
  return api.post("/lab-reports/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateLabReport = (
  id: string,
  data: {
    status?: LabReportStatus;
    remarks?: string;
    report_name?: string;
  }
) => api.put(`/lab-reports/${id}`, data);

export const getLabReport = (id: string) =>
  api.get<{ success: boolean; data: LabReport }>(`/lab-reports/${id}`);

export const getMyLabReports = (params: {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
} = {}) =>
  api.get<{ success: boolean; data: LabReport[] }>("/patients/me/lab-reports", {
    params,
  });

export const getPatientLabReports = (
  patientId: string,
  params: { search?: string; status?: string; from?: string; to?: string } = {}
) =>
  api.get<{ success: boolean; data: LabReport[] }>(
    `/patients/${patientId}/lab-reports`,
    { params }
  );

export const getDoctorLabReports = (
  doctorId: string,
  params: { search?: string; status?: string; from?: string; to?: string } = {}
) =>
  api.get<{ success: boolean; data: LabReport[] }>(
    `/doctors/${doctorId}/lab-reports`,
    { params }
  );

export const fetchLabReportPdf = (id: string) =>
  api.get(`/lab-reports/${id}/download`, { responseType: "blob" });
