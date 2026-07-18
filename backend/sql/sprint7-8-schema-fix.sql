-- Sprint 7/8 schema catch-up
-- The hospital directory (patient portal), public doctor profile, enterprise
-- booking flow, and admin doctor-unavailability tooling reference columns/tables
-- that were missing from the base schema. These statements add them.

-- Facilities: richer profile fields used by the hospital directory.
ALTER TABLE facilities ADD COLUMN email VARCHAR(255) NULL AFTER phone;
ALTER TABLE facilities ADD COLUMN about TEXT NULL AFTER email;
ALTER TABLE facilities ADD COLUMN cover_url TEXT NULL AFTER logo_url;
ALTER TABLE facilities ADD COLUMN established_year INT NULL AFTER cover_url;

-- Providers: fields surfaced on public doctor cards / profiles.
ALTER TABLE providers ADD COLUMN experience_years INT NULL AFTER bio;
ALTER TABLE providers ADD COLUMN qualifications TEXT NULL AFTER experience_years;
ALTER TABLE providers ADD COLUMN consultation_fee DECIMAL(10,2) NULL AFTER qualifications;

-- Appointments: payment + unavailability bookkeeping for the booking flow,
-- and a wider status to allow BOOKED / RESCHEDULED / PENDING_REASSIGNMENT.
ALTER TABLE appointments ADD COLUMN consultation_fee DECIMAL(10,2) NULL AFTER reason;
ALTER TABLE appointments ADD COLUMN payment_status VARCHAR(20) NULL AFTER consultation_fee;
ALTER TABLE appointments ADD COLUMN paid_at DATETIME NULL AFTER payment_status;
ALTER TABLE appointments ADD COLUMN payment_id CHAR(36) NULL AFTER paid_at;
ALTER TABLE appointments ADD COLUMN unavailability_id CHAR(36) NULL AFTER payment_id;
ALTER TABLE appointments MODIFY COLUMN status VARCHAR(40) NOT NULL DEFAULT 'REQUESTED';

-- In-app notifications (appointment / unavailability flows).
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  link VARCHAR(255) NULL,
  meta_json JSON NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  INDEX idx_notifications_user (user_id, is_read, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Payments: booking-flow payments are tied to an appointment (not a bill),
-- so bill_id must be nullable and an appointment_id link is required.
ALTER TABLE payments MODIFY COLUMN bill_id CHAR(36) NULL;
ALTER TABLE payments ADD COLUMN appointment_id CHAR(36) NULL AFTER bill_id;
