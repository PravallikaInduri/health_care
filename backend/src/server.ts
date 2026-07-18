import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { initSocket } from "./config/socket";
import { logger } from "./utils/logger";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

/* Real-time messaging (Socket.IO) shares the same HTTP server */
initSocket(server);

server.listen(PORT, () => {
  logger.info(`Server running on ${PORT}`);
});