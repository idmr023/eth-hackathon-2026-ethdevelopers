import { UserRole } from '@prisma/client';

// Catálogo de permisos RBAC. El backend es la autoridad final.
export const Permissions = {
  ADMIN_MANAGE: 'admin.manage',
  INVOICES_VIEW: 'invoices.view',
  INVOICES_REGISTER: 'invoices.register',
  ADAPTERS_SIGN: 'adapters.sign',
  AUDIT_VIEW: 'audit.view',
  FACTORS_MANAGE: 'factors.manage',
  USERS_MANAGE: 'users.manage',
  AUCTIONS_VIEW: 'auctions.view',
  AUCTIONS_MANAGE: 'auctions.manage',
  AUCTIONS_COMMIT: 'auctions.commit',
  AUCTIONS_REVEAL: 'auctions.reveal',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const RolePermissions: Record<UserRole, readonly Permission[]> = {
  ADMIN: Object.values(Permissions),
  ANALYST: [
    Permissions.INVOICES_VIEW,
    Permissions.INVOICES_REGISTER,
    Permissions.ADAPTERS_SIGN,
    Permissions.AUCTIONS_VIEW,
    Permissions.AUCTIONS_COMMIT,
    Permissions.AUCTIONS_REVEAL,
  ],
};
