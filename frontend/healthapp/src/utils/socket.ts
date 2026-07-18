import { io, type Socket } from "socket.io-client";
import { getToken } from "./auth";

/* The Socket.IO server shares the API host (without the /api path prefix). */
const SOCKET_URL = "http://localhost:3000";

let socket: Socket | null = null;

/**
 * Lazily create (and reuse) a single authenticated socket connection for the
 * whole app. The current JWT is sent in the handshake auth payload.
 */
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
