import { describe, it, expect } from "vitest";
import {
  Permissions,
  can,
  hasAny,
  canManageUsers,
  canManageFactors,
  canViewAudit,
  canSignAdapters,
  canRegisterInvoices,
  canViewInvoices,
  canViewFraudAlerts,
} from "./permissions";
import type { AuthUser } from "./types";

const admin: AuthUser = {
  id: "u1",
  email: "admin@shield.pe",
  role: "ADMIN",
  permissions: Object.values(Permissions),
  mustChangePassword: false,
  factorId: null,
};

const analyst: AuthUser = {
  id: "u2",
  email: "analyst@shield.pe",
  role: "ANALYST",
  permissions: [
    Permissions.INVOICES_VIEW,
    Permissions.INVOICES_REGISTER,
    Permissions.ADAPTERS_SIGN,
  ],
  mustChangePassword: true,
  factorId: null,
};

describe("can", () => {
  it("niega para sesión nula", () => {
    expect(can(null, Permissions.INVOICES_VIEW)).toBe(false);
  });

  it("concede permisos incluidos", () => {
    expect(can(analyst, Permissions.INVOICES_VIEW)).toBe(true);
  });

  it("niega permisos no incluidos", () => {
    expect(can(analyst, Permissions.AUDIT_VIEW)).toBe(false);
  });
});

describe("hasAny", () => {
  it("verdadero si existe al menos un permiso", () => {
    expect(
      hasAny(analyst, [Permissions.AUDIT_VIEW, Permissions.INVOICES_VIEW]),
    ).toBe(true);
  });

  it("falso si no hay coincidencias", () => {
    expect(hasAny(analyst, [Permissions.AUDIT_VIEW, Permissions.USERS_MANAGE])).toBe(false);
  });
});

describe("helpers por rol", () => {
  it("admin puede gestionar usuarios y auditoría", () => {
    expect(canManageUsers(admin)).toBe(true);
    expect(canViewAudit(admin)).toBe(true);
    expect(canManageFactors(admin)).toBe(true);
  });

  it("analista puede registrar y firmar, pero no gestionar", () => {
    expect(canRegisterInvoices(analyst)).toBe(true);
    expect(canSignAdapters(analyst)).toBe(true);
    expect(canManageUsers(analyst)).toBe(false);
    expect(canViewAudit(analyst)).toBe(false);
  });

  it("las alertas de fraude requieren ver facturas", () => {
    expect(canViewFraudAlerts(analyst)).toBe(true);
    expect(canViewInvoices(analyst)).toBe(true);
    expect(canViewInvoices(null)).toBe(false);
  });
});
