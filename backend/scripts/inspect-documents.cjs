require("dotenv").config();
const m = require("mysql2/promise");
const logger = require("./script-logger.cjs");

(async () => {
  const c = await m.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [t] = await c.query("SHOW TABLES LIKE '%document%'");
  logger.info("Document-ish tables:");
  logger.info(t);

  for (const row of t) {
    const tbl = Object.values(row)[0];
    const [def] = await c.query(`SHOW CREATE TABLE \`${tbl}\``);
    logger.info("\n===", tbl, "===");
    logger.info(def[0]["Create Table"]);
  }

  /* also lab_order_results which uses file_name */
  try {
    const [d] = await c.query("SHOW CREATE TABLE lab_order_results");
    logger.info("\n=== lab_order_results ===");
    logger.info(d[0]["Create Table"]);
  } catch (error) {
    logger.warn(
      "lab_order_results table is not available in this schema:",
      error instanceof Error ? error.message : String(error)
    );
  }

  await c.end();
})().catch((e) => {
  logger.error(e instanceof Error ? e.stack || e.message : String(e));
  process.exit(1);
});
