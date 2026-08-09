import type { AuthUser } from "@/lib/types";

export type Persona = "licitante" | "licitador";

export const PERSONA_ROUTES: Record<Persona, string> = {
  licitante: "/licitabien/licitante",
  licitador: "/licitabien/licitador",
};

// Mapeo demo: ADMIN organiza (licitante), ANALYST participa (licitador).
export function getPersona(user: AuthUser | null): Persona {
  return user?.role === "ADMIN" ? "licitante" : "licitador";
}

export function getPersonaRoute(user: AuthUser | null): string {
  return PERSONA_ROUTES[getPersona(user)];
}
