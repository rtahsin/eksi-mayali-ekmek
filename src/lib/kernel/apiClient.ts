export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_PAYLOAD"
  | "INVALID_DATE_RANGE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "ALREADY_REVERSED"
  | "CREDIT_LIMIT_EXCEEDED"
  | "RATE_LIMITED"
  | "DB_UNAVAILABLE"
  | "INTERNAL_ERROR"
  | (string & {});

export interface ApiErrorEnvelope {
  error: string;
  code?: ApiErrorCode;
  details?: Record<string, string[]>;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: Record<string, string[]>;
  readonly retryAfterSeconds?: number;

  constructor(params: {
    status: number;
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string[]>;
    retryAfterSeconds?: number;
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.retryAfterSeconds = params.retryAfterSeconds;
  }
}

export interface ApiRequestOptions {
  signal?: AbortSignal;
  cache?: RequestCache;
  headers?: HeadersInit;
}

function defaultCodeForStatus(status: number): ApiErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "DB_UNAVAILABLE";
  return "INTERNAL_ERROR";
}

function parseDetails(raw: unknown): Record<string, string[]> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) {
      const list = v.filter((item): item is string => typeof item === "string");
      if (list.length > 0) out[k] = list;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const num = Number(headerValue.trim());
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

async function apiRequest<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  url: string,
  body?: unknown,
  options: ApiRequestOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: options.cache ?? "no-store",
    signal: options.signal,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const rawJson: unknown = await res.json().catch(() => null);
  const obj =
    rawJson && typeof rawJson === "object" && !Array.isArray(rawJson)
      ? (rawJson as Record<string, unknown>)
      : null;

  if (!res.ok) {
    const message =
      obj && typeof obj.error === "string" && obj.error.trim().length > 0
        ? obj.error
        : `HTTP ${res.status}`;
    const code =
      obj && typeof obj.code === "string" && obj.code.trim().length > 0
        ? (obj.code as ApiErrorCode)
        : defaultCodeForStatus(res.status);
    const details = obj ? parseDetails(obj.details) : undefined;
    const retryAfterSeconds = parseRetryAfter(res.headers.get("retry-after"));

    throw new ApiClientError({
      status: res.status,
      code,
      message,
      details,
      retryAfterSeconds,
    });
  }

  return rawJson as T;
}

export function apiGet<T>(url: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>("GET", url, undefined, options);
}

export function apiPost<T>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>("POST", url, body, options);
}

export function apiPatch<T>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>("PATCH", url, body, options);
}

export function apiDelete<T>(url: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>("DELETE", url, undefined, options);
}
