require("dotenv").config();
const mysql = require("mysql2/promise");
const logger = require("./script-logger.cjs");

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [users] = await c.query(
    "SELECT id, email, role FROM users WHERE role = 'PHARMACY'"
  );
  logger.info("\nPharmacy users:");
  logger.info(users);

  const [pharmacies] = await c.query(
    "SELECT id, name, type FROM facilities WHERE type = 'PHARMACY'"
  );
  logger.info("\nPharmacy facilities:");
  logger.info(pharmacies);

  const [hospitals] = await c.query(
    "SELECT id, name, type FROM facilities WHERE type = 'HOSPITAL'"
  );
  logger.info("\nHospital facilities:");
  logger.info(hospitals);

  const [fs] = await c.query(
    "SELECT user_id, facility_id, role FROM facility_staff"
  );
  logger.info("\nfacility_staff rows:");
  logger.info(fs);

  const [rxCount] = await c.query("SELECT COUNT(*) AS n FROM prescriptions");
  logger.info(`\nprescriptions count: ${rxCount[0].n}`);

  const [rxSample] = await c.query(
    "SELECT id, patient_id, pharmacy_facility_id, status FROM prescriptions LIMIT 10"
  );
  logger.info("Sample prescriptions:");
  logger.info(rxSample);

  await c.end();
})().catch((e) => {
  logger.error(e instanceof Error ? e.stack || e.message : String(e));
  process.exit(1);
});
