import api from "./axios";

export interface Medication {
  id: string;
  name: string;
  generic_name: string | null;
  ndc_code?: string | null;
  atc_class?: string | null;
  /** True when at least one pharmacy has stocked + priced this medicine. */
  in_pharmacy?: boolean;
  /** Lowest active pharmacy price for this medicine, when stocked. */
  pharmacy_price?: number | null;
}

export const listMedications = (search?: string) =>
  api.get<{ success: boolean; data: Medication[] }>(
    "/healthcare/medications",
    { params: search ? { search } : {} }
  );

export const createMedication = (data: {
  name: string;
  generic_name?: string;
}) =>
  api.post<{ success: boolean; data: Medication }>(
    "/healthcare/medications",
    data
  );
