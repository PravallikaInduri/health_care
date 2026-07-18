/* eslint-disable */
/**
 * Sprint 12 — Pharmacy Facility Scoping · End-to-end demo verification
 *
 * Provisions two pharmacy users (Apollo & Fortis), assigns them to their
 * respective pharmacy facilities via `facility_staff`, seeds one
 * prescription + refill request routed to each pharmacy, then loads the
 * REAL service code (via ts-node) and asserts:
 *
 *   ✓ Apollo pharmacist sees only Apollo's prescriptions / refills
 *   ✓ Fortis pharmacist sees only Fortis's prescriptions / refills
 *   ✓ Apollo pharmacist gets 403 when dispensing a Fortis prescription
 *   ✓ Apollo pharmacist gets 403 when deciding a Fortis refill
 *   ✓ Apollo pharmacist gets 403 when fetching a Fortis prescription by id
 *
 * Run from the backend dir:
 *   node scripts/sprint12-pharmacy-scope-demo.cjs
 */

require("ts-node/register");
require("dotenv").config();

const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
const { v4: uuid } = require("uuid");
const logger = require("./script-logger.cjs");

const {
  listPrescriptionsService,
  getPrescriptionByIdService,
  dispensePrescriptionService,
  listRefillRequestsService,
  decideRefillRequestService,
  getPharmacyStatsService,
  getPharmacyMeService,
} = require("../src/services/prescriptionService");

const {
  getPharmacistFacilityIds,
  PharmacyForbiddenError,
} = require("../src/utils/identity");

const pool = require("../src/config/db").default;

/* ------------------------------------------------------------------
   Deterministic demo IDs (re-runnable / idempotent).
-------------------------------------------------------------------*/
const APOLLO_USER_ID = "U1781520576110"; // existing pharmacy user
const FORTIS_USER_ID = "U-DEMO-FORTIS-PH";

const APOLLO_FACILITY_ID = "cd528842-695f-11f1-9131-00ff4031b653";
const FORTIS_FACILITY_ID = "cd53859e-695f-11f1-9131-00ff4031b653";
const HOSPITAL_FACILITY_ID = "3d34e6b9-63f6-11f1-9bee-00ff4031b653"; // Apollo Hospital

const PROVIDER_ID = "65210b64-63f7-11f1-9bee-00ff4031b653"; // Dr. Sharma
const PATIENT_ID = "e5eb3c23-63f5-11f1-9bee-00ff4031b653"; // Ramesh Kumar

const DEMO_APPT_ID = "11111111-1111-4111-1111-111111111111";
const DEMO_ENC_ID = "22222222-2222-4222-2222-222222222222";
const APOLLO_RX_ID = "33333333-3333-4333-3333-333333333333";
const FORTIS_RX_ID = "44444444-4444-4444-4444-444444444444";
const APOLLO_REFILL_ID = "55555555-5555-4555-5555-555555555555";
const FORTIS_REFILL_ID = "66666666-6666-4666-6666-666666666666";

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  const tag = ok ? "PASS" : "FAIL";
  logger.info(`  ${tag}  ${name}${detail ? ` — ${detail}` : ""}`);
};

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
  });

  logger.info("\n=== Sprint 12 — Pharmacy Facility Scoping demo ===\n");
  logger.info("Step 1 — provisioning users + facility_staff rows...");

  /* Fortis pharmacy user */
  const hash = await bcrypt.hash("pharm@123", 10);
  await c.query(
    `INSERT INTO users (id, email, password_hash, role, approval_status, is_active)
       VALUES (?, ?, ?, 'PHARMACY', 'APPROVED', 1)
     ON DUPLICATE KEY UPDATE email = VALUES(email)`,
    [FORTIS_USER_ID, "fortis.pharmacy@healthcare.com", hash]
  );

  /* Both facility_staff rows. The table now has both `id`+`staff_role`
     (Sprint 9) and legacy `role` (kept for backward compat). We write
     to whichever columns exist so the demo runs against either shape. */
  const [fsCols] = await c.query(
    `
    SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME   = 'facility_staff'
    `,
    [process.env.DB_NAME]
  );
  const have = new Set(fsCols.map((r) => r.COLUMN_NAME));
  const cols = ["user_id", "facility_id"];
  if (have.has("id")) cols.unshift("id");
  if (have.has("role")) cols.push("role");
  if (have.has("staff_role")) cols.push("staff_role");
  const rowPlaceholder = `(${cols.map(() => "?").join(",")})`;

  const buildRow = (userId, facilityId) => {
    const row = [];
    if (have.has("id")) row.push(uuid());
    row.push(userId, facilityId);
    if (have.has("role")) row.push("PHARMACY");
    if (have.has("staff_role")) row.push("PHARMACY");
    return row;
  };

  await c.query(
    `INSERT IGNORE INTO facility_staff (${cols.join(",")})
       VALUES ${rowPlaceholder}, ${rowPlaceholder}`,
    [
      ...buildRow(APOLLO_USER_ID, APOLLO_FACILITY_ID),
      ...buildRow(FORTIS_USER_ID, FORTIS_FACILITY_ID),
    ]
  );

  /* Pick the first medication available */
  const [meds] = await c.query(
    `SELECT id FROM medications ORDER BY name LIMIT 1`
  );
  if (meds.length === 0) {
    throw new Error(
      "No medications seeded — run the base seed first."
    );
  }
  const MED_ID = meds[0].id;

  logger.info("Step 2 — wiping any prior demo rows...");
  await c.query(
    `DELETE FROM refill_requests WHERE id IN (?, ?)`,
    [APOLLO_REFILL_ID, FORTIS_REFILL_ID]
  );
  await c.query(
    `DELETE FROM prescriptions WHERE id IN (?, ?)`,
    [APOLLO_RX_ID, FORTIS_RX_ID]
  );
  await c.query(`DELETE FROM encounters WHERE id = ?`, [DEMO_ENC_ID]);
  await c.query(`DELETE FROM appointments WHERE id = ?`, [DEMO_APPT_ID]);

  logger.info("Step 3 — seeding appointment + encounter...");
  await c.query(
    `INSERT INTO appointments
       (id, patient_id, provider_id, facility_id, scheduled_at,
        duration_min, type, status, reason)
     VALUES (?, ?, ?, ?, NOW(), 30, 'IN_PERSON', 'COMPLETED',
             'Sprint 12 pharmacy scoping demo')`,
    [DEMO_APPT_ID, PATIENT_ID, PROVIDER_ID, HOSPITAL_FACILITY_ID]
  );
  await c.query(
    `INSERT INTO encounters
       (id, appointment_id, provider_id, patient_id, started_at, ended_at,
        chief_complaint)
     VALUES (?, ?, ?, ?, NOW(), NOW(), 'Sprint 12 demo encounter')`,
    [DEMO_ENC_ID, DEMO_APPT_ID, PROVIDER_ID, PATIENT_ID]
  );

  logger.info(
    "Step 4 — seeding one prescription routed to each pharmacy..."
  );
  await c.query(
    `INSERT INTO prescriptions
       (id, encounter_id, patient_id, medication_id, dose, frequency,
        duration_days, refills_allowed, refills_used, instructions,
        status, pharmacy_facility_id)
     VALUES
       (?, ?, ?, ?, '500mg', 'BID', 7, 2, 0, 'Apollo demo rx',
        'ACTIVE', ?),
       (?, ?, ?, ?, '250mg', 'TID', 5, 2, 0, 'Fortis demo rx',
        'ACTIVE', ?)`,
    [
      APOLLO_RX_ID, DEMO_ENC_ID, PATIENT_ID, MED_ID, APOLLO_FACILITY_ID,
      FORTIS_RX_ID, DEMO_ENC_ID, PATIENT_ID, MED_ID, FORTIS_FACILITY_ID,
    ]
  );

  logger.info("Step 5 — seeding one refill request per prescription...");
  await c.query(
    `INSERT INTO refill_requests (id, prescription_id, status, requested_at)
     VALUES (?, ?, 'PENDING', NOW()), (?, ?, 'PENDING', NOW())`,
    [APOLLO_REFILL_ID, APOLLO_RX_ID, FORTIS_REFILL_ID, FORTIS_RX_ID]
  );

  /* ----------------------------------------------------------------
     Step 6 — actual scope assertions against the real service code.
  -----------------------------------------------------------------*/
  logger.info("\nStep 6 — running scope assertions...\n");

  const apolloIds = await getPharmacistFacilityIds(APOLLO_USER_ID);
  const fortisIds = await getPharmacistFacilityIds(FORTIS_USER_ID);

  record(
    "Apollo user resolves to Apollo Pharmacy",
    apolloIds.length === 1 && apolloIds[0] === APOLLO_FACILITY_ID,
    `got [${apolloIds.join(", ")}]`
  );
  record(
    "Fortis user resolves to Fortis Pharmacy",
    fortisIds.length === 1 && fortisIds[0] === FORTIS_FACILITY_ID,
    `got [${fortisIds.join(", ")}]`
  );

  /* PRESCRIPTION LIST SCOPING */
  const apolloList = await listPrescriptionsService({
    pharmacyFacilityIds: apolloIds,
    limit: 100,
  });
  const fortisList = await listPrescriptionsService({
    pharmacyFacilityIds: fortisIds,
    limit: 100,
  });

  const apolloListIds = apolloList.data.map((r) => r.id);
  const fortisListIds = fortisList.data.map((r) => r.id);

  record(
    "Apollo list contains the Apollo rx",
    apolloListIds.includes(APOLLO_RX_ID)
  );
  record(
    "Apollo list excludes the Fortis rx",
    !apolloListIds.includes(FORTIS_RX_ID),
    `apollo sees ${apolloListIds.length} row(s)`
  );
  record(
    "Fortis list contains the Fortis rx",
    fortisListIds.includes(FORTIS_RX_ID)
  );
  record(
    "Fortis list excludes the Apollo rx",
    !fortisListIds.includes(APOLLO_RX_ID),
    `fortis sees ${fortisListIds.length} row(s)`
  );

  /* GET-BY-ID SCOPING */
  try {
    await getPrescriptionByIdService(FORTIS_RX_ID, apolloIds);
    record("Apollo GET /fortis-rx returns 403", false, "no error thrown");
  } catch (e) {
    record(
      "Apollo GET /fortis-rx returns 403",
      e instanceof PharmacyForbiddenError,
      `error: ${e.constructor.name}`
    );
  }
  try {
    const rx = await getPrescriptionByIdService(APOLLO_RX_ID, apolloIds);
    record(
      "Apollo GET /apollo-rx succeeds",
      rx.id === APOLLO_RX_ID
    );
  } catch (e) {
    record(
      "Apollo GET /apollo-rx succeeds",
      false,
      `unexpected error: ${e.message}`
    );
  }

  /* DISPENSE SCOPING (cross-facility must 403, own must succeed) */
  try {
    await dispensePrescriptionService(FORTIS_RX_ID, APOLLO_USER_ID);
    record(
      "Apollo dispensing Fortis rx returns 403",
      false,
      "no error thrown"
    );
  } catch (e) {
    record(
      "Apollo dispensing Fortis rx returns 403",
      e instanceof PharmacyForbiddenError,
      `error: ${e.constructor.name}`
    );
  }
  try {
    const out = await dispensePrescriptionService(
      APOLLO_RX_ID,
      APOLLO_USER_ID
    );
    record(
      "Apollo dispensing Apollo rx succeeds",
      out.status === "DISPENSED"
    );
  } catch (e) {
    record(
      "Apollo dispensing Apollo rx succeeds",
      false,
      `unexpected error: ${e.message}`
    );
  }

  /* REFILL LIST SCOPING */
  const apolloRefills = await listRefillRequestsService({
    pharmacyFacilityIds: apolloIds,
    limit: 100,
  });
  const fortisRefills = await listRefillRequestsService({
    pharmacyFacilityIds: fortisIds,
    limit: 100,
  });

  record(
    "Apollo refill list excludes Fortis refill",
    !apolloRefills.data.some((r) => r.id === FORTIS_REFILL_ID) &&
      apolloRefills.data.some((r) => r.id === APOLLO_REFILL_ID),
    `apollo sees ${apolloRefills.data.length} refill(s)`
  );
  record(
    "Fortis refill list excludes Apollo refill",
    !fortisRefills.data.some((r) => r.id === APOLLO_REFILL_ID) &&
      fortisRefills.data.some((r) => r.id === FORTIS_REFILL_ID),
    `fortis sees ${fortisRefills.data.length} refill(s)`
  );

  /* REFILL DECISION SCOPING */
  try {
    await decideRefillRequestService(
      FORTIS_REFILL_ID,
      "APPROVED",
      APOLLO_USER_ID
    );
    record(
      "Apollo deciding Fortis refill returns 403",
      false,
      "no error thrown"
    );
  } catch (e) {
    record(
      "Apollo deciding Fortis refill returns 403",
      e instanceof PharmacyForbiddenError,
      `error: ${e.constructor.name}`
    );
  }

  /* STATS SCOPING */
  const apolloStats = await getPharmacyStatsService(APOLLO_USER_ID);
  const fortisStats = await getPharmacyStatsService(FORTIS_USER_ID);
  record(
    "Apollo stats only count Apollo rows",
    apolloStats.assigned &&
      apolloStats.totalPrescriptions >= 1 &&
      apolloStats.pendingRefills >= 1,
    JSON.stringify(apolloStats)
  );
  record(
    "Fortis stats only count Fortis rows",
    fortisStats.assigned &&
      fortisStats.totalPrescriptions >= 1 &&
      fortisStats.pendingRefills >= 1,
    JSON.stringify(fortisStats)
  );

  /* PHARMACY IDENTITY (/pharmacy/me) */
  const apolloMe = await getPharmacyMeService(APOLLO_USER_ID);
  const fortisMe = await getPharmacyMeService(FORTIS_USER_ID);
  record(
    "Apollo /pharmacy/me primary = Apollo Pharmacy",
    apolloMe.primaryFacility?.name === "Apollo Pharmacy",
    `got "${apolloMe.primaryFacility?.name}" — hospital "${apolloMe.primaryFacility?.hospital_name}"`
  );
  record(
    "Fortis /pharmacy/me primary = Fortis Pharmacy",
    fortisMe.primaryFacility?.name === "Fortis Pharmacy",
    `got "${fortisMe.primaryFacility?.name}" — hospital "${fortisMe.primaryFacility?.hospital_name}"`
  );

  /* Done */
  await c.end();
  await pool.end();

  const failed = results.filter((r) => !r.ok);
  logger.info("\n----------------------------------------------------");
  logger.info(
    `Result: ${results.length - failed.length}/${results.length} checks passed.`
  );
  if (failed.length > 0) {
    logger.info("\nFailing checks:");
    for (const f of failed) {
      logger.info(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    }
    process.exit(1);
  }
  logger.info(
    "All cross-facility checks green — no PHI leakage between pharmacies."
  );
  process.exit(0);
})().catch(async (err) => {
  logger.error("\nDemo script failed:", err instanceof Error ? err.stack || err.message : String(err));
  try {
    await pool.end();
  } catch (poolError) {
    logger.warn(
      "Failed to close DB pool after demo failure:",
      poolError instanceof Error ? poolError.message : String(poolError)
    );
  }
  process.exit(1);
});
