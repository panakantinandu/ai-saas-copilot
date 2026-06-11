/**
 * Thin fetch wrapper used throughout the app.
 * - Automatically includes credentials (httpOnly cookie) on every request.
 * - Centralises the base URL so changing it is a one-line edit.
 * - Throws a typed ApiError on non-2xx responses so callers can catch cleanly.
 */
export const BASE_URL =
  (import.meta as any).env?.VITE_API_URL ??
  "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

async function request<T>(
  method: Method,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body:
      body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;

    try {
      detail = (await res.json()).detail ?? detail;
    } catch (_) {}

    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) =>
    request<T>("GET", path),

  post: <T>(path: string, body?: unknown) =>
    request<T>("POST", path, body),

  put: <T>(path: string, body?: unknown) =>
    request<T>("PUT", path, body),

  delete: <T>(path: string) =>
    request<T>("DELETE", path),
};
