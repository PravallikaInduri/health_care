-- Facilities: columns expected by admin facility management, hospital listing,
-- and booking confirmation views. The app reads/writes f.logo_url and f.city,
-- which were missing from the original `facilities` table.

ALTER TABLE facilities
  ADD COLUMN city VARCHAR(100) NULL AFTER address;

ALTER TABLE facilities
  ADD COLUMN logo_url TEXT NULL AFTER phone;
