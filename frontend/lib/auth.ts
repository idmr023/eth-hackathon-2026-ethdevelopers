import { apiFetch } from "./api";
import type { AuthUser, AuthUserView } from "./types";

// Catálogo de códigos de error del backend (espejo de common/errors.ts).
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  SESSION_REVOKED: "SESSION_REVOKED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  MUST_CHANGE_PASSWORD: "MUST_CHANGE_PASSWORD",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  FRAUD_DETECTED: "FRAUD_DETECTED",
  INVOICE_ALREADY_VALIDATED: "INVOICE_ALREADY_VALIDATED",
  INVOICE_BLOCKED: "INVOICE_BLOCKED",
  CONFLICT: "CONFLICT",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface TwoFaChallenge {
  step: "verify-2fa";
  pendingToken: string;
}

export interface RegisterInput {
  email: string;
  fullName: string;
  password: string;
  phone?: string;
  dni?: string;
  recoveryQuestion: string;
  recoveryAnswer: string;
}

/** Devuelve la vista del usuario si el login completa, o el desafío 2FA. */
export async function login(
  email: string,
  password: string,
): Promise<AuthUserView | TwoFaChallenge> {
  const { data } = await apiFetch<AuthUserView | TwoFaChallenge>(
    "/api/auth/login",
    {
      method: "POST",
      body: { email, password },
    },
  );
  return data;
}

export async function verify2fa(
  pendingToken: string,
  code: string,
): Promise<AuthUserView> {
  const { data } = await apiFetch<{ user: AuthUserView }>(
    "/api/auth/login/verify-2fa",
    {
      method: "POST",
      body: { pendingToken, code },
    },
  );
  return data.user;
}

export async function register(input: RegisterInput): Promise<AuthUserView> {
  const { data } = await apiFetch<{ user: AuthUserView }>("/api/auth/register", {
    method: "POST",
    body: input,
  });
  return data.user;
}

export async function recoveryInit(
  email: string,
): Promise<{ question: string }> {
  const { data } = await apiFetch<{ question: string }>(
    "/api/auth/recovery/init",
    {
      method: "POST",
      body: { email },
    },
  );
  return data;
}

export async function recoveryReset(input: {
  email: string;
  answer: string;
  newPassword: string;
}): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/auth/recovery/reset", {
    method: "POST",
    body: input,
  });
}

export async function setup2fa(): Promise<{
  secret: string;
  otpauthUri: string;
}> {
  const { data } = await apiFetch<{ secret: string; otpauthUri: string }>(
    "/api/auth/2fa/setup",
    { method: "POST" },
  );
  return data;
}

export async function confirm2fa(code: string): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/auth/2fa/confirm", {
    method: "POST",
    body: { code },
  });
}

export async function disable2fa(code: string): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/auth/2fa/disable", {
    method: "POST",
    body: { code },
  });
}

export async function logout(): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

/** Renueva el access token con la cookie de refresh (rotación de sesión). */
export async function refresh(): Promise<AuthUser> {
  const { data } = await apiFetch<{ user: AuthUser }>("/api/auth/refresh", {
    method: "POST",
  });
  return data.user;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiFetch<{ user: AuthUser }>("/api/auth/me");
  return data.user;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export function isAuthenticated(user: AuthUser | null): boolean {
  return user !== null;
}

export function mustChangePassword(user: AuthUser | null): boolean {
  return user?.mustChangePassword === true;
}