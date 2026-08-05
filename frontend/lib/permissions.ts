import type { AuthUser } from "./types";

// Catálogo de permisos RBAC (espejo de common/permissions.ts del backend).
// El backend es la autoridad; aquí solo filtramos la UI.
export const Permissions = {
  ADMIN_MANAGE: "admin.manage",
  INVOICES_VIEW: "invoices.view",
  INVOICES_REGISTER: "invoices.register",
  ADAPTERS_SIGN: "adapters.sign",
  AUDIT_VIEW: "audit.view",
  FACTORS_MANAGE: "factors.manage",
  USERS_MANAGE: "users.manage",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export function can(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAny(
  user: AuthUser | null,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => can(user, p));
}

export function canManageUsers(user: AuthUser | null): boolean {
  return can(user, Permissions.USERS_MANAGE);
}

export function canManageFactors(user: AuthUser | null): boolean {
  return can(user, Permissions.FACTORS_MANAGE);
}

export function canViewAudit(user: AuthUser | null): boolean {
  return can(user, Permissions.AUDIT_VIEW);
}

export function canViewInvoices(user: AuthUser | null): boolean {
  return can(user, Permissions.INVOICES_VIEW);
}

export function canViewFraudAlerts(user: AuthUser | null): boolean {
  return can(user, Permissions.INVOICES_VIEW);
}

export function canSignAdapters(user: AuthUser | null): boolean {
  return can(user, Permissions.ADAPTERS_SIGN);
}

export function canRegisterInvoices(user: AuthUser | null): boolean {
  return can(user, Permissions.INVOICES_REGISTER);
}
