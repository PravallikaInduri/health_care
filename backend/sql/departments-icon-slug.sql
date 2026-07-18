-- Departments: columns expected by admin department management, facility/provider
-- department listings, and the public doctor/hospital directory. The app
-- reads/writes d.icon and d.slug, which were missing from the original
-- `departments` table (it only had id, name, description).

ALTER TABLE departments
  ADD COLUMN icon VARCHAR(100) NULL AFTER description;

ALTER TABLE departments
  ADD COLUMN slug VARCHAR(150) NULL AFTER icon;

-- Slugs are used for de-duplication / public lookups; enforce uniqueness.
ALTER TABLE departments
  ADD UNIQUE INDEX uq_departments_slug (slug);
