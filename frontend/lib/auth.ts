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
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export async function login(
  email: string,
  password: string,
): Promise<AuthUserView> {
  const { data } = await apiFetch<{ user: AuthUserView }>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
  });
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
