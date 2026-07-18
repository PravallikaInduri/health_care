import api from "./axios";

export interface Bill {
  id: string;
  encounter_id: string;
  subtotal: string | number | null;
  insurance_pay: string | number | null;
  patient_pay: string | number | null;
  status: string | null;
  generated_at: string | null;
  provider_name: string | null;
  amount_paid: string | number | null;
}

export interface Payment {
  id: string;
  gateway: string | null;
  gateway_txn_id: string | null;
  amount: string | number | null;
  status: string | null;
  paid_at: string | null;
}

export interface BillDetail extends Bill {
  patient_id: string;
  payments: Payment[];
}

export interface AppointmentPayment {
  id: string;
  scheduled_at: string | null;
  consultation_fee: string | number | null;
  payment_status: string | null;
  paid_at: string | null;
  provider_name: string | null;
  facility_name: string | null;
  gateway_txn_id: string | null;
  amount_paid: string | number | null;
}

export interface LabCharge {
  id: string;
  paid_at: string | null;
  amount: string | number | null;
  status: string | null;
  lab_name: string | null;
  tests: string | null;
}

export interface PharmacyCharge {
  id: string;
  paid_at: string | null;
  amount: string | number | null;
  dose: string | null;
  frequency: string | null;
  medication_name: string | null;
  pharmacy_name: string | null;
}

export const getMyBills = () =>
  api.get<{ success: boolean; data: Bill[] }>(
    "/healthcare/billing/me"
  );

export const getMyAppointmentPayments = () =>
  api.get<{ success: boolean; data: AppointmentPayment[] }>(
    "/healthcare/billing/me/appointments"
  );

export const getMyLabCharges = () =>
  api.get<{ success: boolean; data: LabCharge[] }>(
    "/healthcare/billing/me/labs"
  );

export const getMyPharmacyCharges = () =>
  api.get<{ success: boolean; data: PharmacyCharge[] }>(
    "/healthcare/billing/me/pharmacy"
  );

export const getBill = (id: string) =>
  api.get<{ success: boolean; data: BillDetail }>(
    `/healthcare/billing/${id}`
  );

export const payBill = (id: string, amount?: number) =>
  api.post<{
    success: boolean;
    data: {
      paymentId: string;
      gateway_txn_id: string;
      amount: number;
      billStatus: string;
    };
  }>(`/healthcare/billing/${id}/pay`, amount !== undefined ? { amount } : {});

/* Provider / Admin */
export const generateBill = (
  encounterId: string,
  data: { subtotal: number; insurance_pay?: number }
) =>
  api.post<{ success: boolean; data: { id: string } }>(
    `/healthcare/billing/from-encounter/${encounterId}`,
    data
  );
