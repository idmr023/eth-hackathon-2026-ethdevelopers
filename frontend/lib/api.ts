// Envoltura del API del backend. Toda respuesta llega como `{ ok, data, total? }`.
// Los errores expone un `code` del catálogo backend.

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

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

export function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const searchParams = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    }
  }
  const queryString = searchParams.toString();
  return `${API_URL}${path}${queryString ? `?${queryString}` : ""}`;
}

// ── Renovación de sesión (single-flight) ──────────────────────────────
// El access token dura 15 min y el refresh 7 días. Si una petición falla
// con 401 de auth, se rota la sesión una sola vez (promesa compartida para
// evitar que el paralelismo revoque el refresh token por rotación) y se
// reintenta la petición original.
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(buildUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function isAuthCode(code: string): boolean {
  return (
    code === "AUTH_REQUIRED" ||
    code === "SESSION_EXPIRED" ||
    code === "SESSION_REVOKED"
  );
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
  _retried = false,
): Promise<ApiResult<T>> {
  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: "no-store",
  });

  let body: unknown = null;
  try {
    body = (await res.json()) as unknown;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const errorBody = body as ErrorEnvelope | null;
    const code = errorBody?.code ?? "INTERNAL_ERROR";
    if (
      !_retried &&
      res.status === 401 &&
      isAuthCode(code) &&
      path !== "/api/auth/refresh"
    ) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        return apiFetch<T>(path, options, true);
      }
    }
    throw new ApiError(
      code,
      res.status,
      errorBody?.message ?? `Error del servidor (${res.status})`,
      errorBody?.details,
    );
  }

  const envelope = body as Envelope<T>;
  return { data: envelope.data, total: envelope.total };
}

// Variante multipart (FormData) para subida de archivos, con la misma lógica
// de retry por sesión. No se envía `Content-Type`: el navegador fija el
// boundary multipart automáticamente.
export async function apiFetchForm<T>(
  path: string,
  form: FormData,
  _retried = false,
): Promise<ApiResult<T>> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    credentials: "include",
    body: form,
    cache: "no-store",
  });

  let body: unknown = null;
  try {
    body = (await res.json()) as unknown;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const errorBody = body as ErrorEnvelope | null;
    const code = errorBody?.code ?? "INTERNAL_ERROR";
    if (
      !_retried &&
      res.status === 401 &&
      isAuthCode(code) &&
      path !== "/api/auth/refresh"
    ) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        return apiFetchForm<T>(path, form, true);
      }
    }
    throw new ApiError(
      code,
      res.status,
      errorBody?.message ?? `Error del servidor (${res.status})`,
      errorBody?.details,
    );
  }

  const envelope = body as Envelope<T>;
  return { data: envelope.data, total: envelope.total };
}
