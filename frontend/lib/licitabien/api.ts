import {
  ApiError,
  apiFetch,
  apiFetchForm,
  buildUrl,
} from "@/lib/api";
import { licitaciones as mockLicitaciones } from "./mock-data";
import type { Licitacion } from "./types";

export interface CreateLicitacionInput {
  title: string;
  category: string;
  budget: number;
  commitEnd: string;
  revealEnd: string;
  description?: string;
}

export interface JoinLicitacionInput {
  licitacionId: string;
  bidderName: string;
  amount: number;
}

function isInfraError(cause: unknown): boolean {
  return !(
    cause instanceof ApiError && cause.status >= 400 && cause.status < 500
  );
}

// Fuente de verdad: backend (Prisma). El mock solo responde si la API no está
// disponible (infraestructura), nunca ante errores reales de negocio.
export async function getLicitaciones(): Promise<Licitacion[]> {
  try {
    const { data } = await apiFetch<Licitacion[]>("/api/licitaciones");
    return data;
  } catch (cause) {
    if (isInfraError(cause)) return mockLicitaciones;
    throw cause;
  }
}

export async function getLicitacion(id: string): Promise<Licitacion | null> {
  try {
    const { data } = await apiFetch<Licitacion>(`/api/licitaciones/${id}`);
    return data;
  } catch (cause) {
    if (!isInfraError(cause)) return null;
    return mockLicitaciones.find((l) => l.id === id) ?? null;
  }
}

export async function createLicitacion(
  input: CreateLicitacionInput,
): Promise<Licitacion> {
  const { data } = await apiFetch<Licitacion>("/api/licitaciones", {
    method: "POST",
    body: input,
  });
  return data;
}

// Presenta la oferta con propuesta PDF obligatoria: sin el archivo no se
// puede ofertar y no existe vía posterior para adjuntarlo.
export async function joinLicitacionWithProposal(
  input: JoinLicitacionInput,
  proposal: File,
): Promise<Licitacion> {
  const form = new FormData();
  form.set("licitacionId", input.licitacionId);
  form.set("bidderName", input.bidderName);
  form.set("amount", String(input.amount));
  form.set("proposal", proposal, proposal.name);
  const { data } = await apiFetchForm<Licitacion>("/api/licitaciones/join", form);
  return data;
}

export async function revealLicitacion(
  licitacionId: string,
  amount: number,
): Promise<Licitacion> {
  const { data } = await apiFetch<Licitacion>(
    `/api/licitaciones/${licitacionId}/reveal`,
    { method: "POST", body: { amount } },
  );
  return data;
}

export async function evaluateLicitacion(
  licitacionId: string,
): Promise<Licitacion> {
  const { data } = await apiFetch<Licitacion>(
    `/api/licitaciones/${licitacionId}/evaluate`,
    { method: "POST" },
  );
  return data;
}

// Descarga la propuesta PDF (con cookies) y devuelve un objectURL para
// visualizar/descargar. El caller es responsable de revocar la URL.
export async function fetchProposalBlobUrl(
  licitacionId: string,
  providerId: string,
): Promise<string> {
  const res = await fetch(
    buildUrl(
      `/api/licitaciones/${licitacionId}/providers/${providerId}/proposal`,
    ),
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) {
    let code = "INTERNAL_ERROR";
    let message = `Error del servidor (${res.status})`;
    try {
      const err = (await res.json()) as { code?: string; message?: string };
      code = err.code ?? code;
      message = err.message ?? message;
    } catch {
      // No hay envelope JSON (p. ej. proxy); usamos el mensaje por defecto.
    }
    throw new ApiError(code, res.status, message);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
