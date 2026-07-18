/**
 * Idempotent migration runner for ad-hoc schema patches that don't yet
 * have a real migration framework. Add new entries to MIGRATIONS as the
 * schema evolves; each entry must be re-runnable safely.
 *
 * Run with:   node scripts/apply-pending-migrations.cjs
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const columnExists = (table, column) => async (conn) => {
  const [rows] = await conn.query(
    `
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME   = ?
      AND COLUMN_NAME  = ?
    LIMIT 1
    `,
    [process.env.DB_NAME, table, column]
  );
  return rows.length > 0;
};

const columnIsNullable = (table, column) => async (conn) => {
  const [rows] = await conn.query(
    `
    SELECT IS_NULLABLE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME   = ?
      AND COLUMN_NAME  = ?
    LIMIT 1
    `,
    [process.env.DB_NAME, table, column]
  );
  return rows.length > 0 && rows[0].IS_NULLABLE === "YES";
};

const tableExists = async (conn, table) => {
  const [rows] = await conn.query(
    `
    SELECT 1
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME   = ?
    LIMIT 1
    `,
    [process.env.DB_NAME, table]
  );
  return rows.length > 0;
};

const indexExists = (table, indexName) => async (conn) => {
  const [rows] = await conn.query(
    `
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME   = ?
      AND INDEX_NAME   = ?
    LIMIT 1
    `,
    [process.env.DB_NAME, table, indexName]
  );
  return rows.length > 0;
};

const indexExistsOrTableMissing = (table, indexName) => async (conn) => {
  if (!(await tableExists(conn, table))) return true;
  return indexExists(table, indexName)(conn);
};

const columnExistsOrTableMissing = (table, column) => async (conn) => {
  if (!(await tableExists(conn, table))) return true;
  return columnExists(table, column)(conn);
};

const MIGRATIONS = [
  {
    name: "messages.edited_at",
    description:
      "Sprint 5 — add edited_at marker so edited messages render an 'edited' tag",
    check: columnExists("messages", "edited_at"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE messages
           ADD COLUMN edited_at DATETIME NULL AFTER read_at`
      );
    },
  },
  {
    name: "documents.file_name",
    description:
      "Documents (patient uploads) — add file_name column so uploads and downloads keep the original filename",
    check: columnExists("documents", "file_name"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE documents
           ADD COLUMN file_name VARCHAR(255) NULL AFTER type`
      );
    },
  },
  {
    name: "documents.file_data",
    description:
      "Documents — add LONGBLOB column so files are stored inline (matches documentService INSERT)",
    check: columnExists("documents", "file_data"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE documents
           ADD COLUMN file_data LONGBLOB NULL AFTER url`
      );
    },
  },
  {
    name: "documents.url-nullable",
    description:
      "Documents — relax NOT NULL on url because the new upload path stores bytes in file_data and leaves url NULL",
    check: columnIsNullable("documents", "url"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE documents
           MODIFY COLUMN url TEXT NULL`
      );
    },
  },

  /* ---------------------------------------------------------------- *
   * Sprint 8 — Hospital data model & staff roles (foundation)         *
   * ---------------------------------------------------------------- */

  {
    name: "users.role += staff roles",
    description:
      "Sprint 8 — allow PHARMACY, HOSPITAL_ADMIN and LAB_TECH on users.role",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT COLUMN_TYPE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'users'
          AND COLUMN_NAME  = 'role'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      const type = rows.length ? String(rows[0].COLUMN_TYPE) : "";
      return (
        type.includes("HOSPITAL_ADMIN") &&
        type.includes("LAB_ADMIN") &&
        type.includes("LAB_TECH") &&
        type.includes("PHARMACY")
      );
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE users
           MODIFY COLUMN role
           ENUM('PATIENT','PROVIDER','ADMIN','OPS','PHARMACY','HOSPITAL_ADMIN','LAB_ADMIN','LAB_TECH')
           NOT NULL`
      );
    },
  },

  {
    name: "facilities.type += PHARMACY",
    description: "Sprint 8 — allow a PHARMACY facility type",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT COLUMN_TYPE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'facilities'
          AND COLUMN_NAME  = 'type'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      const type = rows.length ? String(rows[0].COLUMN_TYPE) : "";
      return type.includes("PHARMACY");
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE facilities
           MODIFY COLUMN type ENUM('HOSPITAL','CLINIC','LAB','PHARMACY') NOT NULL`
      );
    },
  },

  {
    name: "facilities.parent_facility_id",
    description:
      "Sprint 8 — a hospital owns child LAB/PHARMACY facilities via parent_facility_id",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'facilities'
          AND COLUMN_NAME  = 'parent_facility_id'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE facilities
           ADD COLUMN parent_facility_id CHAR(36) NULL AFTER type`
      );
      await conn.query(
        `ALTER TABLE facilities
           ADD INDEX idx_facilities_parent (parent_facility_id)`
      );
      await conn.query(
        `ALTER TABLE facilities
           ADD CONSTRAINT fk_facilities_parent
           FOREIGN KEY (parent_facility_id) REFERENCES facilities(id)
           ON DELETE SET NULL`
      );
    },
  },

  {
    name: "facility_staff table",
    description:
      "Sprint 8 — link users to the facility they staff (hospital admin, lab tech, pharmacist)",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'facility_staff'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `
        CREATE TABLE facility_staff (
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
        )
        `
      );
    },
  },

  {
    name: "lab_orders.lab_facility_id",
    description:
      "Sprint 8 — routing target for a lab order + best-effort backfill from the appointment facility",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'lab_orders'
          AND COLUMN_NAME  = 'lab_facility_id'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE lab_orders
           ADD COLUMN lab_facility_id CHAR(36) NULL AFTER patient_id`
      );
      await conn.query(
        `ALTER TABLE lab_orders
           ADD INDEX idx_lab_orders_lab_facility (lab_facility_id)`
      );
      await conn.query(
        `
        UPDATE lab_orders lo
          JOIN encounters e   ON e.id = lo.encounter_id
          JOIN appointments a ON a.id = e.appointment_id
           SET lo.lab_facility_id = a.facility_id
         WHERE lo.lab_facility_id IS NULL
           AND a.facility_id IS NOT NULL
        `
      );
    },
  },

  {
    name: "prescriptions.pharmacy_facility_id",
    description:
      "Sprint 8 — routing target for a prescription + best-effort backfill from the appointment facility",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'prescriptions'
          AND COLUMN_NAME  = 'pharmacy_facility_id'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE prescriptions
           ADD COLUMN pharmacy_facility_id CHAR(36) NULL AFTER patient_id`
      );
      await conn.query(
        `ALTER TABLE prescriptions
           ADD INDEX idx_prescriptions_pharmacy_facility (pharmacy_facility_id)`
      );
      await conn.query(
        `
        UPDATE prescriptions p
          JOIN encounters e   ON e.id = p.encounter_id
          JOIN appointments a ON a.id = e.appointment_id
           SET p.pharmacy_facility_id = a.facility_id
         WHERE p.pharmacy_facility_id IS NULL
           AND a.facility_id IS NOT NULL
        `
      );
    },
  },

  /* ---------------------------------------------------------------- *
   * Sprint 9 (part 1) — Hospital self-registration + verification     *
   * ---------------------------------------------------------------- */

  {
    name: "facilities registration columns",
    description:
      "Sprint 9 — approval_status, rejection_reason, has_lab, has_pharmacy, owner_user_id",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'facilities'
          AND COLUMN_NAME  = 'approval_status'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE facilities
           ADD COLUMN approval_status ENUM('PENDING','APPROVED','REJECTED')
             NOT NULL DEFAULT 'APPROVED' AFTER type`
      );
      await conn.query(
        `ALTER TABLE facilities
           ADD COLUMN rejection_reason TEXT NULL AFTER approval_status`
      );
      await conn.query(
        `ALTER TABLE facilities
           ADD COLUMN has_lab TINYINT(1) NOT NULL DEFAULT 0 AFTER rejection_reason`
      );
      await conn.query(
        `ALTER TABLE facilities
           ADD COLUMN has_pharmacy TINYINT(1) NOT NULL DEFAULT 0 AFTER has_lab`
      );
      await conn.query(
        `ALTER TABLE facilities
           ADD COLUMN owner_user_id CHAR(36) NULL AFTER has_pharmacy`
      );
      await conn.query(
        `ALTER TABLE facilities
           ADD INDEX idx_facilities_owner (owner_user_id)`
      );
      // Existing admin-created facilities remain visible.
      await conn.query(
        `UPDATE facilities SET approval_status = 'APPROVED'`
      );
    },
  },

  {
    name: "hospital_otps table",
    description:
      "Sprint 9 — OTP + proof-document staging for hospital registration",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'hospital_otps'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `
        CREATE TABLE hospital_otps (
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
        )
        `
      );
    },
  },

  {
    name: "hospital_otps.email index",
    description:
      "Hospital OTP verification filters by email; index it to avoid full table scans.",
    check: indexExists("hospital_otps", "idx_hospital_otps_email"),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_hospital_otps_email ON hospital_otps (email)`
      );
    },
  },

  {
    name: "hospital_otps.expires_at index",
    description:
      "Hospital OTP expiry checks and cleanup use expires_at; index it for scalability.",
    check: indexExists("hospital_otps", "idx_hospital_otps_expires_at"),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_hospital_otps_expires_at ON hospital_otps (expires_at)`
      );
    },
  },

  {
    name: "facility_documents table",
    description:
      "Sprint 9 — verification documents for a facility (mirror of provider_documents)",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'facility_documents'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `
        CREATE TABLE facility_documents (
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
        )
        `
      );
    },
  },

  /* ---------------------------------------------------------------- *
   * Sprint 9 (part 2) — Hospital portal                               *
   * ---------------------------------------------------------------- */

  {
    name: "facility_staff.display_name",
    description:
      "Sprint 9 — human-friendly name for a staff member created via the hospital portal",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'facility_staff'
          AND COLUMN_NAME  = 'display_name'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      /* Place the new column AFTER whichever role column actually
         exists. Some deployments have the slim `role` column,
         later migrations renamed it to `staff_role`. We probe at
         runtime so the migration runs cleanly on both shapes. */
      const [roleCols] = await conn.query(
        `
        SELECT COLUMN_NAME
          FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ?
           AND TABLE_NAME   = 'facility_staff'
           AND COLUMN_NAME IN ('staff_role', 'role')
         LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      const after = roleCols.length ? roleCols[0].COLUMN_NAME : null;
      await conn.query(
        `ALTER TABLE facility_staff
           ADD COLUMN display_name VARCHAR(150) NULL${
             after ? ` AFTER ${after}` : ""
           }`
      );
    },
  },

  /* ---------------------------------------------------------------- *
   * Sprint 6 fix — prescription lifecycle columns                     *
   * (status/dispensed_*) that the pharmacy + provider flows expect.   *
   * ---------------------------------------------------------------- */

  {
    name: "prescriptions.status",
    description:
      "Prescription lifecycle status used by provider create + pharmacy dispense",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'prescriptions'
          AND COLUMN_NAME  = 'status'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE prescriptions
           ADD COLUMN status ENUM('ACTIVE','DISPENSED','CANCELLED')
             NOT NULL DEFAULT 'ACTIVE' AFTER instructions`
      );
    },
  },

  {
    name: "prescriptions.dispensed_at",
    description: "When a prescription was dispensed by a pharmacy",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'prescriptions'
          AND COLUMN_NAME  = 'dispensed_at'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE prescriptions
           ADD COLUMN dispensed_at DATETIME NULL AFTER status`
      );
    },
  },

  {
    name: "prescriptions.dispensed_by",
    description: "User id of the pharmacy staff who dispensed",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'prescriptions'
          AND COLUMN_NAME  = 'dispensed_by'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE prescriptions
           ADD COLUMN dispensed_by CHAR(36) NULL AFTER dispensed_at`
      );
    },
  },

  /* ---------------------------------------------------------------- *
   * Sprint 9 fix — Bring slim `facility_staff` tables up to the      *
   * full schema (id PK + staff_role + created_at) that hospital      *
   * portal / hospital OTP verification / lab portal expect.           *
   * Older deployments created the table with just                    *
   *   (user_id, facility_id, role)                                   *
   * which makes every later INSERT/SELECT against id/staff_role fail.*
   * ---------------------------------------------------------------- */

  {
    name: "facility_staff.id",
    description:
      "Sprint 9 fix — give facility_staff a UUID primary key so portal INSERTs (id, …) work",
    check: async (conn) => {
      /* Treat the migration as applied only when `id` exists AND it
         is part of the primary key — partial completions on a prior
         run should be picked up and finished. */
      const [rows] = await conn.query(
        `
        SELECT 1
          FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = ?
           AND TABLE_NAME   = 'facility_staff'
           AND INDEX_NAME   = 'PRIMARY'
           AND COLUMN_NAME  = 'id'
         LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      const [idCol] = await conn.query(
        `
        SELECT 1
          FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ?
           AND TABLE_NAME   = 'facility_staff'
           AND COLUMN_NAME  = 'id'
         LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      if (idCol.length === 0) {
        await conn.query(
          `ALTER TABLE facility_staff
             ADD COLUMN id CHAR(36) NULL FIRST`
        );
      }
      /* Backfill UUIDs for any rows still missing one. */
      await conn.query(
        `UPDATE facility_staff SET id = (UUID()) WHERE id IS NULL OR id = ''`
      );
      /* Drop whatever PRIMARY KEY currently exists (likely on the
         legacy (user_id, facility_id) pair) before installing the new
         one on id. Foreign keys from other tables reference the
         existing PK columns, so we disable FK checks for the swap
         and add a covering UNIQUE index on the same pair so MySQL
         keeps the FK valid afterwards. */
      try {
        await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
        /* Add the unique index BEFORE dropping the PK so MySQL never
           sees the FK target columns un-indexed. */
        const [legacyIdx] = await conn.query(
          `
          SELECT 1
            FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA = ?
             AND TABLE_NAME   = 'facility_staff'
             AND INDEX_NAME   = 'uq_facility_staff_user_facility'
           LIMIT 1
          `,
          [process.env.DB_NAME]
        );
        if (legacyIdx.length === 0) {
          await conn.query(
            `ALTER TABLE facility_staff
               ADD UNIQUE KEY uq_facility_staff_user_facility (user_id, facility_id)`
          );
        }
        try {
          await conn.query(`ALTER TABLE facility_staff DROP PRIMARY KEY`);
        } catch (e) {
          if (e.code !== "ER_CANT_DROP_FIELD_OR_KEY") throw e;
        }
        await conn.query(
          `ALTER TABLE facility_staff
             MODIFY COLUMN id CHAR(36) NOT NULL,
             ADD PRIMARY KEY (id)`
        );
      } finally {
        await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);
      }
    },
  },

  {
    name: "facility_staff.staff_role",
    description:
      "Sprint 9 fix — add staff_role column expected by hospital portal & OTP verification; backfill from legacy `role`",
    check: columnExists("facility_staff", "staff_role"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE facility_staff
           ADD COLUMN staff_role VARCHAR(40) NULL AFTER facility_id`
      );
      /* Mirror legacy role values so nothing the existing code reads
         disappears. We keep both columns going forward; identity.ts
         is being updated in the same change to read staff_role. */
      const [legacy] = await conn.query(
        `
        SELECT 1
          FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ?
           AND TABLE_NAME   = 'facility_staff'
           AND COLUMN_NAME  = 'role'
         LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      if (legacy.length > 0) {
        await conn.query(
          `UPDATE facility_staff
              SET staff_role = role
            WHERE staff_role IS NULL AND role IS NOT NULL`
        );
      }
      /* Default anything still NULL to a safe role so NOT NULL holds. */
      await conn.query(
        `UPDATE facility_staff
            SET staff_role = 'STAFF'
          WHERE staff_role IS NULL`
      );
      await conn.query(
        `ALTER TABLE facility_staff
           MODIFY COLUMN staff_role VARCHAR(40) NOT NULL`
      );
    },
  },

  {
    name: "facility_staff.created_at",
    description:
      "Sprint 9 fix — track when a staff assignment was created",
    check: columnExists("facility_staff", "created_at"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE facility_staff
           ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`
      );
    },
  },

  /* ---------------------------------------------------------------- *
   * Sprint 6 — Lab orders: requested tests + uploaded result files   *
   * Mirrors backend/sql/sprint6-labs.sql so deployments that never   *
   * ran that file get the same tables idempotently.                   *
   * ---------------------------------------------------------------- */

  {
    name: "lab_order_tests table",
    description:
      "Sprint 6 — list of tests requested on a lab order (provider sets these, patient/lab sees them)",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'lab_order_tests'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `
        CREATE TABLE lab_order_tests (
          id CHAR(36) PRIMARY KEY,
          lab_order_id CHAR(36) NOT NULL,
          test_name VARCHAR(255) NOT NULL,
          instructions TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_lab_order_tests_order (lab_order_id),
          CONSTRAINT fk_lab_order_tests_order
            FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id)
            ON DELETE CASCADE
        )
        `
      );
    },
  },

  {
    name: "refill_requests.status += DISPENSED",
    description:
      "Refill flow: patient requests -> doctor APPROVES -> pharmacy DISPENSES. Adds DISPENSED to the status enum.",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT COLUMN_TYPE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'refill_requests'
          AND COLUMN_NAME  = 'status'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      const type = rows.length ? String(rows[0].COLUMN_TYPE) : "";
      return type.includes("DISPENSED");
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE refill_requests
           MODIFY COLUMN status
           ENUM('PENDING','APPROVED','REJECTED','DISPENSED')
           NULL DEFAULT 'PENDING'`
      );
    },
  },

  {
    name: "providers.video_consultation_fee",
    description:
      "Separate fee for video consultations; in-person uses consultation_fee. Backfills from consultation_fee.",
    check: columnExists("providers", "video_consultation_fee"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE providers
           ADD COLUMN video_consultation_fee DECIMAL(10,2) NULL AFTER consultation_fee`
      );
      await conn.query(
        `UPDATE providers
            SET video_consultation_fee = consultation_fee
          WHERE video_consultation_fee IS NULL`
      );
    },
  },

  /* ---------------------------------------------------------------- *
   * Sprint 7/8 catch-up — public profiles, booking payments, alerts   *
   * ---------------------------------------------------------------- */
  {
    name: "facilities.email",
    description: "Hospital directory exposes facility email.",
    check: columnExistsOrTableMissing("facilities", "email"),
    apply: async (conn) => {
      await conn.query(`ALTER TABLE facilities ADD COLUMN email VARCHAR(255) NULL AFTER phone`);
    },
  },
  {
    name: "facilities.about",
    description: "Hospital directory exposes facility about text.",
    check: columnExistsOrTableMissing("facilities", "about"),
    apply: async (conn) => {
      await conn.query(`ALTER TABLE facilities ADD COLUMN about TEXT NULL AFTER email`);
    },
  },
  {
    name: "facilities.cover_url",
    description: "Hospital directory supports cover images.",
    check: columnExistsOrTableMissing("facilities", "cover_url"),
    apply: async (conn) => {
      await conn.query(`ALTER TABLE facilities ADD COLUMN cover_url TEXT NULL AFTER logo_url`);
    },
  },
  {
    name: "facilities.established_year",
    description: "Hospital directory shows established year.",
    check: columnExistsOrTableMissing("facilities", "established_year"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE facilities ADD COLUMN established_year INT NULL AFTER cover_url`
      );
    },
  },
  {
    name: "providers.experience_years",
    description: "Public doctor profiles show experience.",
    check: columnExistsOrTableMissing("providers", "experience_years"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE providers ADD COLUMN experience_years INT NULL AFTER bio`
      );
    },
  },
  {
    name: "providers.qualifications",
    description: "Public doctor profiles show qualifications.",
    check: columnExistsOrTableMissing("providers", "qualifications"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE providers ADD COLUMN qualifications TEXT NULL AFTER experience_years`
      );
    },
  },
  {
    name: "providers.consultation_fee",
    description: "Booking flow shows consultation fee.",
    check: columnExistsOrTableMissing("providers", "consultation_fee"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE providers ADD COLUMN consultation_fee DECIMAL(10,2) NULL AFTER qualifications`
      );
    },
  },
  {
    name: "appointments.consultation_fee",
    description: "Appointment stores selected consultation fee.",
    check: columnExistsOrTableMissing("appointments", "consultation_fee"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE appointments ADD COLUMN consultation_fee DECIMAL(10,2) NULL AFTER reason`
      );
    },
  },
  {
    name: "appointments.payment_status",
    description: "Appointment stores booking payment status.",
    check: columnExistsOrTableMissing("appointments", "payment_status"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE appointments ADD COLUMN payment_status VARCHAR(20) NULL AFTER consultation_fee`
      );
    },
  },
  {
    name: "appointments.paid_at",
    description: "Appointment stores payment timestamp.",
    check: columnExistsOrTableMissing("appointments", "paid_at"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE appointments ADD COLUMN paid_at DATETIME NULL AFTER payment_status`
      );
    },
  },
  {
    name: "appointments.payment_id",
    description: "Appointment stores external payment reference.",
    check: columnExistsOrTableMissing("appointments", "payment_id"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE appointments ADD COLUMN payment_id CHAR(36) NULL AFTER paid_at`
      );
    },
  },
  {
    name: "appointments.unavailability_id",
    description: "Appointment links to provider unavailability.",
    check: columnExistsOrTableMissing("appointments", "unavailability_id"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE appointments ADD COLUMN unavailability_id CHAR(36) NULL AFTER payment_id`
      );
    },
  },
  {
    name: "appointments.status width",
    description: "Appointment status supports longer workflow values.",
    check: async (conn) => {
      if (!(await tableExists(conn, "appointments"))) return true;
      const [rows] = await conn.query(
        `
        SELECT CHARACTER_MAXIMUM_LENGTH
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'appointments'
          AND COLUMN_NAME = 'status'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0 && Number(rows[0].CHARACTER_MAXIMUM_LENGTH) >= 40;
    },
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE appointments MODIFY COLUMN status VARCHAR(40) NOT NULL DEFAULT 'REQUESTED'`
      );
    },
  },
  {
    name: "notifications table",
    description: "In-app notifications for appointment workflows.",
    check: async (conn) => tableExists(conn, "notifications"),
    apply: async (conn) => {
      await conn.query(
        `CREATE TABLE notifications (
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
        )`
      );
    },
  },
  {
    name: "notifications user index",
    description: "Notification inbox filters by user/read status/date.",
    check: indexExistsOrTableMissing("notifications", "idx_notifications_user"),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_notifications_user
           ON notifications (user_id, is_read, created_at)`
      );
    },
  },
  {
    name: "payments.bill_id nullable",
    description: "Booking payments may be linked to appointments instead of bills.",
    check: async (conn) => {
      if (!(await tableExists(conn, "payments"))) return true;
      return columnIsNullable("payments", "bill_id")(conn);
    },
    apply: async (conn) => {
      await conn.query(`ALTER TABLE payments MODIFY COLUMN bill_id CHAR(36) NULL`);
    },
  },
  {
    name: "payments.appointment_id",
    description: "Booking payments link to appointments.",
    check: columnExistsOrTableMissing("payments", "appointment_id"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE payments ADD COLUMN appointment_id CHAR(36) NULL AFTER bill_id`
      );
    },
  },

  {
    name: "lab_tests table",
    description:
      "Per-lab catalogue of offered tests with prices (managed by the lab tech).",
    check: async (conn) => {
      const [rows] = await conn.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lab_tests' LIMIT 1`,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `
        CREATE TABLE lab_tests (
          id CHAR(36) PRIMARY KEY,
          lab_facility_id CHAR(36) NOT NULL,
          name VARCHAR(255) NOT NULL,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_lab_tests_facility_name (lab_facility_id, name),
          INDEX idx_lab_tests_facility (lab_facility_id),
          CONSTRAINT fk_lab_tests_facility
            FOREIGN KEY (lab_facility_id) REFERENCES facilities(id) ON DELETE CASCADE
        )
        `
      );
    },
  },

  {
    name: "lab_orders payment columns",
    description:
      "Charge + payment tracking on a lab order (amount, payment_status, paid_at).",
    check: columnExists("lab_orders", "payment_status"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE lab_orders
           ADD COLUMN amount DECIMAL(10,2) NULL AFTER status`
      );
      await conn.query(
        `ALTER TABLE lab_orders
           ADD COLUMN payment_status ENUM('UNPAID','PAID') NOT NULL DEFAULT 'UNPAID' AFTER amount`
      );
      await conn.query(
        `ALTER TABLE lab_orders
           ADD COLUMN paid_at DATETIME NULL AFTER payment_status`
      );
    },
  },

  {
    name: "pharmacy_medicines table",
    description:
      "Per-pharmacy catalogue of stocked medicines with prices (managed by the pharmacist).",
    check: async (conn) => {
      const [rows] = await conn.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pharmacy_medicines' LIMIT 1`,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `
        CREATE TABLE pharmacy_medicines (
          id CHAR(36) PRIMARY KEY,
          pharmacy_facility_id CHAR(36) NOT NULL,
          medication_id CHAR(36) NOT NULL,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_pharmacy_medicines (pharmacy_facility_id, medication_id),
          INDEX idx_pharmacy_medicines_facility (pharmacy_facility_id),
          CONSTRAINT fk_pharmacy_medicines_facility
            FOREIGN KEY (pharmacy_facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
          CONSTRAINT fk_pharmacy_medicines_med
            FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
        )
        `
      );
    },
  },

  {
    name: "pharmacy_medicines.quantity",
    description:
      "Number of tablets/units the pharmacy stocks for a catalogue medicine.",
    check: columnExists("pharmacy_medicines", "quantity"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE pharmacy_medicines
           ADD COLUMN quantity INT NOT NULL DEFAULT 0 AFTER price`
      );
    },
  },

  {
    name: "prescriptions payment columns",
    description:
      "Charge + payment tracking on a prescription (amount, payment_status, paid_at).",
    check: columnExists("prescriptions", "payment_status"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE prescriptions
           ADD COLUMN amount DECIMAL(10,2) NULL AFTER status`
      );
      await conn.query(
        `ALTER TABLE prescriptions
           ADD COLUMN payment_status ENUM('UNPAID','PAID') NOT NULL DEFAULT 'UNPAID' AFTER amount`
      );
      await conn.query(
        `ALTER TABLE prescriptions
           ADD COLUMN paid_at DATETIME NULL AFTER payment_status`
      );
    },
  },

  {
    name: "users.two_factor_enabled",
    description:
      "Security — per-user toggle for email-based two-factor authentication at login",
    check: columnExists("users", "two_factor_enabled"),
    apply: async (conn) => {
      await conn.query(
        `ALTER TABLE users
           ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0`
      );
    },
  },

  {
    name: "two_factor_codes table",
    description:
      "Security — short-lived email codes used to enable/disable 2FA and to complete a 2FA login",
    check: async (conn) => {
      const [rows] = await conn.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'two_factor_codes' LIMIT 1`,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `
        CREATE TABLE two_factor_codes (
          id CHAR(36) PRIMARY KEY,
          user_id CHAR(36) NOT NULL,
          code VARCHAR(10) NOT NULL,
          purpose ENUM('LOGIN','ENABLE','DISABLE') NOT NULL DEFAULT 'LOGIN',
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_two_factor_codes_user (user_id),
          CONSTRAINT fk_two_factor_codes_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        `
      );
    },
  },

  {
    name: "lab_order_results table",
    description:
      "Sprint 6 — result files uploaded against a lab order (used by /provider/lab-orders, /patient/labs, /lab/orders)",
    check: async (conn) => {
      const [rows] = await conn.query(
        `
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'lab_order_results'
        LIMIT 1
        `,
        [process.env.DB_NAME]
      );
      return rows.length > 0;
    },
    apply: async (conn) => {
      await conn.query(
        `
        CREATE TABLE lab_order_results (
          id CHAR(36) PRIMARY KEY,
          lab_order_id CHAR(36) NOT NULL,
          test_name VARCHAR(255) NULL,
          file_name VARCHAR(255) NOT NULL,
          mime VARCHAR(100) NULL,
          file_data LONGBLOB NULL,
          note TEXT NULL,
          uploaded_by CHAR(36) NULL,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_lab_order_results_order (lab_order_id),
          CONSTRAINT fk_lab_order_results_order
            FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id)
            ON DELETE CASCADE
        )
        `
      );
    },
  },
  {
    name: "lab_reports table",
    description:
      "Lab Report Management — finalized PDF reports with patient, doctor and hospital access controls",
    check: async (conn) => tableExists(conn, "lab_reports"),
    apply: async (conn) => {
      await conn.query(
        `
        CREATE TABLE lab_reports (
          id CHAR(36) PRIMARY KEY,
          patient_id CHAR(36) NOT NULL,
          appointment_id CHAR(36) NULL,
          encounter_id CHAR(36) NULL,
          lab_test_id CHAR(36) NULL,
          lab_order_id CHAR(36) NULL,
          uploaded_by CHAR(36) NOT NULL,
          report_name VARCHAR(255) NOT NULL,
          report_file_url VARCHAR(500) NULL,
          report_file_data LONGBLOB NULL,
          mime VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
          remarks TEXT NULL,
          status ENUM('PENDING','SAMPLE_COLLECTED','PROCESSING','COMPLETED','UPLOADED') NOT NULL DEFAULT 'PENDING',
          uploaded_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_lab_reports_patient_id (patient_id),
          INDEX idx_lab_reports_lab_test_id (lab_test_id),
          INDEX idx_lab_reports_uploaded_by (uploaded_by),
          INDEX idx_lab_reports_status (status),
          INDEX idx_lab_reports_order (lab_order_id),
          CONSTRAINT fk_lab_reports_patient
            FOREIGN KEY (patient_id) REFERENCES patients(id)
            ON DELETE CASCADE,
          CONSTRAINT fk_lab_reports_order
            FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id)
            ON DELETE SET NULL
        )
        `
      );
    },
  },

  /* ---------------------------------------------------------------- *
   * Review hardening — indexes for high-volume read/ownership paths    *
   * ---------------------------------------------------------------- */
  {
    name: "patients.user_id index",
    description: "Resolve patient profile by authenticated user without a scan.",
    check: indexExistsOrTableMissing("patients", "idx_patients_user_id"),
    apply: async (conn) => {
      await conn.query(`CREATE INDEX idx_patients_user_id ON patients (user_id)`);
    },
  },
  {
    name: "providers.user_id index",
    description: "Resolve provider profile by authenticated user without a scan.",
    check: indexExistsOrTableMissing("providers", "idx_providers_user_id"),
    apply: async (conn) => {
      await conn.query(`CREATE INDEX idx_providers_user_id ON providers (user_id)`);
    },
  },
  {
    name: "appointments.provider schedule index",
    description:
      "Provider availability, dashboards and conflict checks filter by provider/date/status.",
    check: indexExistsOrTableMissing(
      "appointments",
      "idx_appointments_provider_schedule"
    ),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_appointments_provider_schedule
           ON appointments (provider_id, scheduled_at, status)`
      );
    },
  },
  {
    name: "appointments.patient schedule index",
    description:
      "Patient appointment history filters by patient and sorts by scheduled date.",
    check: indexExistsOrTableMissing(
      "appointments",
      "idx_appointments_patient_schedule"
    ),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_appointments_patient_schedule
           ON appointments (patient_id, scheduled_at, status)`
      );
    },
  },
  {
    name: "prescriptions.patient status index",
    description:
      "Patient prescriptions and refill eligibility filter by patient/status.",
    check: indexExistsOrTableMissing(
      "prescriptions",
      "idx_prescriptions_patient_status"
    ),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_prescriptions_patient_status
           ON prescriptions (patient_id, status)`
      );
    },
  },
  {
    name: "bills.encounter_id index",
    description: "Bill generation checks for existing encounter bills.",
    check: indexExistsOrTableMissing("bills", "idx_bills_encounter_id"),
    apply: async (conn) => {
      await conn.query(`CREATE INDEX idx_bills_encounter_id ON bills (encounter_id)`);
    },
  },
  {
    name: "audit_logs review index",
    description:
      "Admin audit review filters by actor/action and sorts by occurrence time.",
    check: indexExistsOrTableMissing("audit_logs", "idx_audit_logs_review"),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_audit_logs_review
           ON audit_logs (occurred_at, actor_id, action)`
      );
    },
  },
  {
    name: "lab_orders facility date index",
    description: "Lab portal order queues filter by lab and sort by ordered date.",
    check: indexExistsOrTableMissing(
      "lab_orders",
      "idx_lab_orders_facility_ordered"
    ),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_lab_orders_facility_ordered
           ON lab_orders (lab_facility_id, ordered_at)`
      );
    },
  },
  {
    name: "payments.appointment_id index",
    description:
      "Appointment payment lookup joins payments by appointment_id.",
    check: indexExistsOrTableMissing("payments", "idx_payments_appointment_id"),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_payments_appointment_id ON payments (appointment_id)`
      );
    },
  },
  {
    name: "documents patient index",
    description: "Patient document lists filter by patient and uploaded date.",
    check: indexExistsOrTableMissing("documents", "idx_documents_patient"),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_documents_patient ON documents (patient_id, uploaded_at)`
      );
    },
  },
  {
    name: "message_threads patient index",
    description: "Patient message inbox filters by patient and last message time.",
    check: indexExistsOrTableMissing("message_threads", "idx_threads_patient"),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_threads_patient
           ON message_threads (patient_id, last_message_at)`
      );
    },
  },
  {
    name: "message_threads provider index",
    description: "Provider message inbox filters by provider and last message time.",
    check: indexExistsOrTableMissing("message_threads", "idx_threads_provider"),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_threads_provider
           ON message_threads (provider_id, last_message_at)`
      );
    },
  },
  {
    name: "refill_requests prescription index",
    description: "Refill request lists join/filter by prescription and status.",
    check: indexExistsOrTableMissing(
      "refill_requests",
      "idx_refill_prescription"
    ),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_refill_prescription
           ON refill_requests (prescription_id, status)`
      );
    },
  },
  {
    name: "bills patient generated index",
    description: "Patient billing list filters by patient and generated date.",
    check: indexExistsOrTableMissing("bills", "idx_bills_patient"),
    apply: async (conn) => {
      await conn.query(
        `CREATE INDEX idx_bills_patient ON bills (patient_id, generated_at)`
      );
    },
  },
];

const main = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  process.stdout.write(`Connected to ${process.env.DB_NAME} on ${process.env.DB_HOST}\n`);

  for (const m of MIGRATIONS) {
    process.stdout.write(`• ${m.name} — `);
    const already = await m.check(conn);
    if (already) {
      process.stdout.write("already applied, skipping\n");
      continue;
    }
    await m.apply(conn);
    process.stdout.write("applied\n");
  }

  await conn.end();
  process.stdout.write("Done.\n");
};

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
