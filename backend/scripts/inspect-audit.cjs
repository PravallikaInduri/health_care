require("dotenv").config();
const m = require("mysql2/promise");

(async () => {
  const c = await m.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [rows] = await c.query(
    `SELECT action, success, reason, occurred_at
       FROM audit_logs
      WHERE action IN (
        'DISPENSED','REFILL_APPROVED','REFILL_REJECTED',
        'PRESCRIPTION_DISPENSE_DENIED','REFILL_DECISION_DENIED'
      )
      ORDER BY occurred_at DESC
      LIMIT 10`
  );
  console.table(rows);
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
