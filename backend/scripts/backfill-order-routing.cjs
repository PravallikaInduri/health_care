/**
 * Sprint 10/12 backfill — route existing lab orders & prescriptions to the
 * LAB / PHARMACY unit owned by the hospital where the encounter took place.
 *
 * Idempotent: only fills rows whose routing target is still NULL and whose
 * hospital actually has a matching approved unit.
 *
 * Run with:   node scripts/backfill-order-routing.cjs
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const logger = require("./script-logger.cjs");

const main = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  logger.info(`Connected to ${process.env.DB_NAME} on ${process.env.DB_HOST}`);

  // Lab orders -> hospital's LAB unit
  const [labRes] = await conn.query(
    `
    UPDATE lab_orders lo
      JOIN encounters e   ON e.id = lo.encounter_id
      JOIN appointments a ON a.id = e.appointment_id
      JOIN facilities hf  ON hf.id = a.facility_id
      JOIN facilities lab
        ON lab.parent_facility_id =
           (CASE WHEN hf.type = 'HOSPITAL' THEN hf.id ELSE hf.parent_facility_id END)
       AND lab.type = 'LAB'
       AND lab.approval_status = 'APPROVED'
       SET lo.lab_facility_id = lab.id
     WHERE lo.lab_facility_id IS NULL
    `
  );
  logger.info(`Lab orders routed: ${labRes.affectedRows}`);

  // Prescriptions -> hospital's PHARMACY unit
  const [rxRes] = await conn.query(
    `
    UPDATE prescriptions rx
      JOIN encounters e   ON e.id = rx.encounter_id
      JOIN appointments a ON a.id = e.appointment_id
      JOIN facilities hf  ON hf.id = a.facility_id
      JOIN facilities ph
        ON ph.parent_facility_id =
           (CASE WHEN hf.type = 'HOSPITAL' THEN hf.id ELSE hf.parent_facility_id END)
       AND ph.type = 'PHARMACY'
       AND ph.approval_status = 'APPROVED'
       SET rx.pharmacy_facility_id = ph.id
     WHERE rx.pharmacy_facility_id IS NULL
    `
  );
  logger.info(`Prescriptions routed: ${rxRes.affectedRows}`);

  await conn.end();
  logger.info("Backfill done.");
};

main().catch((err) => {
  logger.error("Backfill failed:", err instanceof Error ? err.stack || err.message : String(err));
  process.exitCode = 1;
});
