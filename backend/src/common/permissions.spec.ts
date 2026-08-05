import { UserRole } from '@prisma/client';
import { Permissions, RolePermissions } from './permissions';

describe('RBAC permissions', () => {
  it('ADMIN posee todos los permisos del catálogo (super-gate)', () => {
    const all = Object.values(Permissions);
    expect(all).toHaveLength(7);
    for (const permission of all) {
      expect(RolePermissions[UserRole.ADMIN]).toContain(permission);
    }
  });

  it('ANALYST solo puede ver/registrar facturas y firmar vía adaptadores', () => {
    expect(RolePermissions[UserRole.ANALYST]).toEqual([
      Permissions.INVOICES_VIEW,
      Permissions.INVOICES_REGISTER,
      Permissions.ADAPTERS_SIGN,
    ]);
  });

  it('ANALYST no puede gestionar usuarios, factores ni ver auditoría', () => {
    expect(RolePermissions[UserRole.ANALYST]).not.toContain(
      Permissions.USERS_MANAGE,
    );
    expect(RolePermissions[UserRole.ANALYST]).not.toContain(
      Permissions.FACTORS_MANAGE,
    );
    expect(RolePermissions[UserRole.ANALYST]).not.toContain(
      Permissions.AUDIT_VIEW,
    );
  });

  it('los valores del catálogo usan convención dominio.accion', () => {
    for (const value of Object.values(Permissions)) {
      expect(value).toMatch(/^[a-z]+\.[a-z]+$/);
    }
  });
});
