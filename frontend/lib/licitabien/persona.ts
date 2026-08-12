// Rutas puras del switch libre (desacoplado de rol → persona).
// El backend sigue derivando el rol del usuario autenticado; aquí cualquier
// usuario con sesión puede abrir ambos paneles directamente.

export const DEFAULT_APP_ROUTE = "/licitabien/licitante";

export const PERSONA_ROUTES = {
  licitante: "/licitabien/licitante",
  licitador: "/licitabien/licitador",
};
