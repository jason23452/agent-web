type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue>;

export type ApiRequestConfig = {
  body?: unknown;
  headers?: HeadersInit;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: QueryParams;
  signal?: AbortSignal;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    details?: unknown;
    message?: string;
  };
  code?: string;
  message?: string;
};

export class ApiError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly status: number;

  constructor({
    code = "API_ERROR",
    details,
    message,
    status,
  }: {
    code?: string;
    details?: unknown;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  return "API request failed.";
}

export async function apiRequest<TResponse>(endpoint: string, config: ApiRequestConfig = {}): Promise<TResponse> {
  const response = await fetch(buildApiUrl(endpoint, config.query), {
    body: config.body === undefined
      ? undefined
      : config.body instanceof FormData
        ? config.body
        : JSON.stringify(config.body),
    headers: buildHeaders(config),
    method: config.method ?? "GET",
    signal: config.signal,
  });
  const data = await parseResponse(response);

  if (!response.ok) {
    const payload = data as ApiErrorPayload | undefined;
    const error = payload?.error;

    throw new ApiError({
      code: error?.code ?? payload?.code ?? "API_ERROR",
      details: error?.details ?? payload,
      message: error?.message ?? payload?.message ?? response.statusText,
      status: response.status,
    });
  }

  return data as TResponse;
}

export async function apiRequestText(endpoint: string, config: ApiRequestConfig = {}): Promise<string> {
  const response = await fetch(buildApiUrl(endpoint, config.query), {
    body: config.body === undefined
      ? undefined
      : config.body instanceof FormData
        ? config.body
        : JSON.stringify(config.body),
    headers: buildHeaders(config),
    method: config.method ?? "GET",
    signal: config.signal,
  });
  const text = await response.text();

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = text ? JSON.parse(text) as ApiErrorPayload : undefined;
    } catch {
      payload = undefined;
    }
    const error = payload?.error;

    throw new ApiError({
      code: error?.code ?? payload?.code ?? "API_ERROR",
      details: error?.details ?? payload,
      message: error?.message ?? payload?.message ?? response.statusText,
      status: response.status,
    });
  }

  return text;
}

export function buildApiUrl(endpoint: string, query?: QueryParams): string {
  const baseUrl = resolveApiBaseUrl();
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(endpoint.replace(/^\/+/, ""), normalizedBaseUrl);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function buildHeaders(config: ApiRequestConfig): Headers {
  const headers = new Headers(config.headers);
  headers.set("Accept", "application/json");

  if (config.body !== undefined && !(config.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function resolveApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_BFF_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl;

  return "http://127.0.0.1:8000";
}
