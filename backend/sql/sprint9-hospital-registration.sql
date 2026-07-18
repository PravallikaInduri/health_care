-- Sprint 9 (part 1) — Hospital self-registration + admin verification
--
-- Mirrors the doctor onboarding flow: a hospital registers, uploads a proof PDF,
-- declares whether it has a lab / pharmacy, and can only log in once an admin
-- approves it. Real/re-runnable application lives in
-- backend/scripts/apply-pending-migrations.cjs.

-- 1. Facilities gain a registration lifecycle + declared capabilities + owner.
ALTER TABLE facilities
  ADD COLUMN approval_status ENUM('PENDING','APPROVED','REJECTED')
    NOT NULL DEFAULT 'APPROVED' AFTER type;
ALTER TABLE facilities
  ADD COLUMN rejection_reason TEXT NULL AFTER approval_status;
ALTER TABLE facilities
  ADD COLUMN has_lab TINYINT(1) NOT NULL DEFAULT 0 AFTER rejection_reason;
ALTER TABLE facilities
  ADD COLUMN has_pharmacy TINYINT(1) NOT NULL DEFAULT 0 AFTER has_lab;
ALTER TABLE facilities
  ADD COLUMN owner_user_id CHAR(36) NULL AFTER has_pharmacy;
ALTER TABLE facilities
  ADD INDEX idx_facilities_owner (owner_user_id);

-- Existing admin-created facilities stay visible.
UPDATE facilities SET approval_status = 'APPROVED' WHERE approval_status IS NULL;

-- 2. OTP staging for hospital registration (mirror of doctor_otps).
CREATE TABLE IF NOT EXISTS hospital_otps (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  about TEXT NULL,
  password_hash VARCHAR(255) NULL,
  has_lab TINYINT(1) NOT NULL DEFAULT 0,
  has_pharmacy TINYINT(1) NOT NULL DEFAULT 0,
  file_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  file_data LONGBLOB NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hospital_otps_email ON hospital_otps (email);
CREATE INDEX idx_hospital_otps_expires_at ON hospital_otps (expires_at);

-- 3. Verification documents for a facility (mirror of provider_documents).
CREATE TABLE IF NOT EXISTS facility_documents (
  id CHAR(36) PRIMARY KEY,
  facility_id CHAR(36) NOT NULL,
  document_type VARCHAR(100) NULL,
  file_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  file_data LONGBLOB NULL,
  verification_status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_facility_documents_facility (facility_id),
  CONSTRAINT fk_facility_documents_facility
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);
