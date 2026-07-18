import type { Request } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

export interface ActorContext {
  actorId: string | null;
  actorRole: string | null;
  ip: string | null;
  userAgent: string | null;
}

/**
 * Best-effort extraction of the acting user + request metadata for audit logs.
 * Never throws: if no/invalid token is present, actor fields fall back to null
 * so it can be used on both authenticated and unauthenticated routes.
 */
export const getAuditContext = (
  req: Request
): ActorContext => {
  let actorId: string | null = null;
  let actorRole: string | null = null;

  try {
    const token =
      req.headers?.authorization?.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as JwtPayload;

      actorId = decoded.id ?? null;
      actorRole = decoded.role ?? null;
    }
  } catch {
    // Invalid/expired token — leave actor as null
  }

  return {
    actorId,
    actorRole,
    ip:
      (req.headers?.["x-forwarded-for"] as string) ||
      req.ip ||
      req.socket?.remoteAddress ||
      null,
    userAgent: req.headers?.["user-agent"] || null
  };
};
