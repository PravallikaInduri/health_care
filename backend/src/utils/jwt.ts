import jwt from "jsonwebtoken";
import type { UserRole } from "../types/auth";

export const generateToken = (
  id: string,
  role: UserRole
): string => {

  return jwt.sign(
    {
      id,
      role
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "1h"
    }
  );
};

export const generateRefreshToken = (
  userId: string
): string => {

  return jwt.sign(
    {
      userId
    },
    process.env.JWT_REFRESH_SECRET!,
    {
      expiresIn: "7d"
    }
  );

};