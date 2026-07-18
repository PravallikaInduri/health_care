import Cookies from "js-cookie";
import { disconnectSocket } from "./socket";

const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const REFRESH_KEY = "refreshToken";

const cookieOptions: Cookies.CookieAttributes = {
  expires: 7,
  sameSite: "strict",
  path: "/",
};

export const setAuth = (data: {
  token: string;
  role: string;
  refreshToken?: string;
}) => {
  Cookies.set(TOKEN_KEY, data.token, cookieOptions);
  Cookies.set(ROLE_KEY, data.role, cookieOptions);

  if (data.refreshToken) {
    Cookies.set(
      REFRESH_KEY,
      data.refreshToken,
      cookieOptions
    );
  }
};

export const getToken = () => {
  return Cookies.get(TOKEN_KEY);
};

export const getRole = () => {
  return Cookies.get(ROLE_KEY);
};

/**
 * Decode the current user's id from the JWT payload (best-effort). Used to
 * tell apart "my" messages from the other party's in real-time events.
 */
export const getUserId = (): string | null => {
  const token = Cookies.get(TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id ?? null;
  } catch {
    return null;
  }
};

export const getRefreshToken = () => {
  return Cookies.get(REFRESH_KEY);
};

export const isAuthenticated = () => {
  return !!Cookies.get(TOKEN_KEY);
};

export const logout = () => {
  Cookies.remove(TOKEN_KEY, { path: "/" });
  Cookies.remove(ROLE_KEY, { path: "/" });
  Cookies.remove(REFRESH_KEY, { path: "/" });
  disconnectSocket();
};
