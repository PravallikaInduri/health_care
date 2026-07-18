import api from "./axios";

export type LabOrderStatus =
  | "ORDERED"
  | "RECEIVED"
  | "IN_PROGRESS"
  | "COMPLETED";

export interface LabOrderTest {
  id: string;
  test_name: string;
  instructions: string | null;
  price: number | null;
}

export interface LabTest {
  id: string;
  name: string;
  price: number | string;
  is_active: 0 | 1 | boolean;
  created_at: string;
}

export interface LabOrderUpload {
  id: string;
  test_name: string | null;
  file_name: string | null;
  mime: string | null;
  note: string | null;
  uploaded_at: string;
  size_bytes: number | null;
}

export interface LabOrder {
  id: string;
  ordered_at: string;
  status: LabOrderStatus;
  amount: number | string | null;
  payment_status: "UNPAID" | "PAID";
  paid_at: string | null;
  total: number;
  first_name: string | null;
  last_name: string | null;
  mrn: string | null;
  provider_name: string | null;
  tests: LabOrderTest[];
  uploads: LabOrderUpload[];
}

export interface LabMe {
  lab: { id: string; name: string; hospital_name: string | null };
  counts: {
    total: number;
    pending: number;
    completed: number;
    totalTests: number;
    pendingReports: number;
    completedReports: number;
    uploadedToday: number;
    patientsTested: number;
  };
}

export const getLabMe = () => api.get("/lab/me");

export const getLabOrders = (status?: string) =>
  api.get("/lab/orders", { params: status ? { status } : {} });

export const updateLabOrderStatus = (id: string, status: LabOrderStatus) =>
  api.patch(`/lab/orders/${id}/status`, { status });

export const downloadLabResult = (id: string) =>
  api.get(`/lab/results/${id}/file`, { responseType: "blob" });

export const uploadLabResult = (
  orderId: string,
  file: File,
  opts?: { test_name?: string; note?: string }
) => {
  const form = new FormData();
  form.append("file", file);
  if (opts?.test_name) form.append("test_name", opts.test_name);
  if (opts?.note) form.append("note", opts.note);
  return api.post(`/lab/orders/${orderId}/results`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const markLabOrderPaid = (orderId: string) =>
  api.post(`/lab/orders/${orderId}/paid`);

/* Lab test catalogue */
export const getLabTests = () => api.get("/lab/tests");

export const createLabTest = (payload: { name: string; price: number }) =>
  api.post("/lab/tests", payload);

export const updateLabTest = (
  id: string,
  payload: { name?: string; price?: number; is_active?: boolean }
) => api.patch(`/lab/tests/${id}`, payload);

export const deleteLabTest = (id: string) => api.delete(`/lab/tests/${id}`);
