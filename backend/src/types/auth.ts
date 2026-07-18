import type { Request } from "express";

export type UserRole =
  | "PATIENT"
  | "PROVIDER"
  | "ADMIN"
  | "OPS"
  | "PHARMACY"
  | "HOSPITAL_ADMIN"
  | "LAB_ADMIN"
  | "LAB_TECH"
  | "NURSE"
  | "COMPLIANCE";

export interface AccessTokenPayload {
  id: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      user: AccessTokenPayload;
    }
  }
}

export interface AuthenticatedRequest<
  Params = Record<string, string>,
  ResBody = unknown,
  ReqBody = Record<string, never>,
  ReqQuery = Record<string, string | undefined>
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user: AccessTokenPayload;
}

export const isAccessTokenPayload = (
  value: unknown
): value is AccessTokenPayload => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { id?: unknown; role?: unknown };
  return typeof candidate.id === "string" && typeof candidate.role === "string";
};
