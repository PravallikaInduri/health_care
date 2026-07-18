import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/auth";

export type ControllerRequest = AuthenticatedRequest<
  Record<string, string>,
  unknown,
  Record<string, unknown>,
  Record<string, string | undefined>
>;

export const pickId = (raw: unknown): string => {
  if (Array.isArray(raw)) return String(raw[0] || "");
  return String(raw || "");
};

export const errorStatus = (error: unknown, fallback = 500): number => {
  const message = error instanceof Error ? error.message : String(error || "");
  if (message === "Forbidden" || /forbidden|only edit|only delete/i.test(message)) {
    return 403;
  }
  if (/not found/i.test(message)) return 404;
  if (/already exists|already been uploaded|already fully paid|nothing left/i.test(message)) {
    return 409;
  }
  if (/must be|exceeds|no patient record|greater than|no longer available/i.test(message)) {
    return 400;
  }
  return fallback;
};

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Internal Server Error";

export const sendError = (
  res: Response,
  error: unknown,
  fallbackStatus = 500
) =>
  res.status(errorStatus(error, fallbackStatus)).json({
    success: false,
    message: errorMessage(error),
  });
