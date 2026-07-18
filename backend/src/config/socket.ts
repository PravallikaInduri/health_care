import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { isAccessTokenPayload } from "../types/auth";

let io: Server | null = null;

/**
 * Attach a Socket.IO server to the existing HTTP server. Each socket is
 * authenticated with the same JWT used by the REST API and joined to a private
 * room (`user:<userId>`) so events can be targeted at specific participants.
 */
export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      );

      if (!isAccessTokenPayload(decoded)) {
        return next(new Error("Invalid authentication token"));
      }

      socket.data.userId = decoded.id;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("disconnect", () => {
      /* room membership is cleaned up automatically */
    });
  });

  return io;
};

export const getIO = (): Server | null => io;

/**
 * Emit an event to one or more users by their user id (best-effort: no-op when
 * the socket layer is not initialised).
 */
export const emitToUsers = (
  userIds: Array<string | null | undefined>,
  event: string,
  payload: unknown
): void => {
  if (!io) return;
  const unique = Array.from(
    new Set(userIds.filter((id): id is string => !!id))
  );
  for (const id of unique) {
    io.to(`user:${id}`).emit(event, payload);
  }
};
