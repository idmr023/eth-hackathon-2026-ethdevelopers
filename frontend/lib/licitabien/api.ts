import { ApiError, apiFetch } from "@/lib/api";
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

export async function joinLicitacion(
  input: JoinLicitacionInput,
): Promise<Licitacion> {
  const { data } = await apiFetch<Licitacion>("/api/licitaciones/join", {
    method: "POST",
    body: input,
  });
  return data;
}
