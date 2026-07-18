import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

/* Skip the eager startup connection probe during tests: the data layer is
   mocked there, so the probe would only emit a misleading connection error. */
if (process.env.NODE_ENV !== "test") {
  pool.getConnection()
    .then((connection) => {
      logger.info("Database connected successfully");
      connection.release();
    })
    .catch((err) => {
      logger.error(
        "Database connection failed",
        err instanceof Error ? err.message : String(err)
      );
    });
}

export default pool;