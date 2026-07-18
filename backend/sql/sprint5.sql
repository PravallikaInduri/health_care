-- Sprint 5 — Communication & Billing
-- Schema adjustments needed by Sprint 5 features.
--
-- The `documents` table originally stored only a `url`. To support real file
-- uploads (consistent with how `provider_documents` stores LONGBLOB binary),
-- we add file_name + file_data columns and make `url` optional.

ALTER TABLE documents
  ADD COLUMN file_name VARCHAR(255) NULL AFTER type;

ALTER TABLE documents
  ADD COLUMN file_data LONGBLOB NULL AFTER url;

ALTER TABLE documents
  MODIFY COLUMN url TEXT NULL;

-- Helpful indexes for Sprint 5 read paths
CREATE INDEX idx_documents_patient ON documents (patient_id, uploaded_at);
CREATE INDEX idx_threads_patient ON message_threads (patient_id, last_message_at);
CREATE INDEX idx_threads_provider ON message_threads (provider_id, last_message_at);
CREATE INDEX idx_refill_prescription ON refill_requests (prescription_id, status);
CREATE INDEX idx_bills_patient ON bills (patient_id, generated_at);
