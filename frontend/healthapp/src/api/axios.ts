import axios from "axios";
import { getToken, logout } from "../utils/auth";
import { startAction, endAction } from "../utils/actionLoader";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
});

/* Whether a request counts as an "action" worth showing the global loader.
   Reads (GET/HEAD) are silent; mutations (POST/PUT/PATCH/DELETE) show the
   stethoscope loader. Opt out per-request with config.meta.silent = true. */
const isActionRequest = (config: any) => {
  if (config?.meta?.silent) return false;
  const method = String(config?.method || "get").toLowerCase();
  return !["get", "head", "options"].includes(method);
};

api.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (isActionRequest(config)) {
      (config as any).__isAction = true;
      startAction();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if ((response.config as any)?.__isAction) endAction();
    return response;
  },
  (error) => {
    if ((error.config as any)?.__isAction) endAction();

    if (error.response?.status === 401) {
      logout();

      if (
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
