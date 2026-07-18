-- Sprint 8 — Hospital Data Model & Staff Roles (foundation)
--
-- Canonical DDL for the hospital multi-tenant foundation. Plain ALTER TABLE in
-- MySQL is NOT natively idempotent, so the safe/re-runnable runner lives in
-- backend/scripts/apply-pending-migrations.cjs (it checks information_schema
-- before applying each step). This file documents the intended end state.

-- 1. Roles: allow facility-scoped staff roles (PHARMACY was also missing).
ALTER TABLE users
  MODIFY COLUMN role
  ENUM('PATIENT','PROVIDER','ADMIN','OPS','PHARMACY','HOSPITAL_ADMIN','LAB_TECH')
  NOT NULL;

-- 2. Facilities: a hospital owns child LAB / PHARMACY facilities.
ALTER TABLE facilities
  MODIFY COLUMN type ENUM('HOSPITAL','CLINIC','LAB','PHARMACY') NOT NULL;

ALTER TABLE facilities
  ADD COLUMN parent_facility_id CHAR(36) NULL AFTER type;

ALTER TABLE facilities
  ADD INDEX idx_facilities_parent (parent_facility_id);

ALTER TABLE facilities
  ADD CONSTRAINT fk_facilities_parent
  FOREIGN KEY (parent_facility_id) REFERENCES facilities(id)
  ON DELETE SET NULL;

-- 3. Facility staff: which users work at which facility, and in what capacity.
CREATE TABLE IF NOT EXISTS facility_staff (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  facility_id CHAR(36) NOT NULL,
  staff_role VARCHAR(40) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_facility_staff_user_facility (user_id, facility_id),
  INDEX idx_facility_staff_user (user_id),
  INDEX idx_facility_staff_facility (facility_id),
  CONSTRAINT fk_facility_staff_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_facility_staff_facility
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

-- 4. Routing columns: where each order / prescription was sent.
ALTER TABLE lab_orders
  ADD COLUMN lab_facility_id CHAR(36) NULL AFTER patient_id;
ALTER TABLE lab_orders
  ADD INDEX idx_lab_orders_lab_facility (lab_facility_id);

ALTER TABLE prescriptions
  ADD COLUMN pharmacy_facility_id CHAR(36) NULL AFTER patient_id;
ALTER TABLE prescriptions
  ADD INDEX idx_prescriptions_pharmacy_facility (pharmacy_facility_id);

-- 5. Best-effort backfill via encounter -> appointment -> facility.
UPDATE lab_orders lo
  JOIN encounters e   ON e.id = lo.encounter_id
  JOIN appointments a ON a.id = e.appointment_id
   SET lo.lab_facility_id = a.facility_id
 WHERE lo.lab_facility_id IS NULL
   AND a.facility_id IS NOT NULL;

UPDATE prescriptions p
  JOIN encounters e   ON e.id = p.encounter_id
  JOIN appointments a ON a.id = e.appointment_id
   SET p.pharmacy_facility_id = a.facility_id
 WHERE p.pharmacy_facility_id IS NULL
   AND a.facility_id IS NOT NULL;
