import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { isAccessTokenPayload, type AccessTokenPayload } from "../types/auth";

export const authenticate = (
  req: Request & { user?: AccessTokenPayload },
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    if (!isAccessTokenPayload(decoded)) {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};

/**
 * Restricts a route to specific roles. Must be placed AFTER `authenticate`
 * so that req.user is populated. Falls back to 403 on role mismatch.
 */
export const authorize = (
  ...roles: string[]
) => {
  return (
    req: Request & { user?: AccessTokenPayload },
    res: Response,
    next: NextFunction
  ) => {
    const role = req.user?.role;

    if (!role || !roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient role"
      });
    }

    next();
  };
};

/**
 * Convenience guard for admin-only routes.
 */
export const requireAdmin = authorize("ADMIN");