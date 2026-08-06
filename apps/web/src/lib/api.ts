import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

/**
 * Single axios instance for the whole app.
 *
 * - `withCredentials` so the httpOnly refresh-token cookie (scoped to
 *   /api/auth) is sent on refresh/logout calls.
 * - The access token lives in memory here and is attached per-request.
 * - A 401 triggers one silent refresh, then the original request is retried.
 *   If refresh fails, `onAuthFailure` is invoked so the app can log out.
 */

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const api = axios.create({ baseURL, withCredentials: true });

let accessToken: string | null = null;
let onAuthFailure: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setOnAuthFailure(handler: () => void) {
  onAuthFailure = handler;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

// De-duplicate concurrent refreshes: every 401 awaits the same promise.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = api
      .post<{ data: { accessToken: string } }>("/auth/refresh")
      .then((res) => {
        const token = res.data.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .catch(() => null)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    const url = original?.url ?? "";
    const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.set("Authorization", `Bearer ${token}`);
        return api(original);
      }
      onAuthFailure?.();
    }
    return Promise.reject(error);
  },
);

/** Unwrap the API's `{ success, data }` envelope and return just `data`. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await api.request<{ data: T }>(config);
  return res.data.data;
}

/**
 * Resolve a GET to `null` on 404 instead of throwing. Transcript/summary
 * endpoints 404 before the artifact has been requested — callers treat that
 * as "none yet" rather than an error.
 */
export async function getOrNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

/** Turn an axios error into a user-facing message. */
export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined;
    const msg = data?.message ?? data?.error;
    if (Array.isArray(msg)) return msg.join(", ");
    if (msg) return msg;
  }
  return fallback;
}
