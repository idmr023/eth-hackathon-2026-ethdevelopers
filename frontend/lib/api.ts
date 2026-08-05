// Envoltura del API del backend. Toda respuesta llega como `{ ok, data, total? }`.
// Los errores expone un `code` del catálogo backend.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiResult<T> {
  data: T;
  total?: number;
}

interface Envelope<T> {
  ok: boolean;
  data: T;
  total?: number;
}

interface ErrorEnvelope {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  let body: unknown = null;
  try {
    body = (await res.json()) as unknown;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const errorBody = body as ErrorEnvelope | null;
    throw new ApiError(
      errorBody?.code ?? "INTERNAL_ERROR",
      res.status,
      errorBody?.message ?? `Error del servidor (${res.status})`,
      errorBody?.details,
    );
  }

  const envelope = body as Envelope<T>;
  return { data: envelope.data, total: envelope.total };
}
