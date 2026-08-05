import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/rbac.decorators';
import { AppError, ErrorCodes } from '../errors';
import { Permissions, Permission } from '../permissions';
import type { AuthenticatedRequest } from '../auth-request';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!requiredRoles || requiredRoles.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new AppError(
        ErrorCodes.AUTH_REQUIRED,
        401,
        'Autenticación requerida',
      );
    }

    if (
      requiredRoles &&
      requiredRoles.length > 0 &&
      !requiredRoles.includes(user.role)
    ) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        403,
        'Tu rol no permite esta acción',
      );
    }

    // Super-gate: admin.manage pasa cualquier permiso.
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasSuperGate = user.permissions.includes(Permissions.ADMIN_MANAGE);
      const allowed = requiredPermissions.every(
        (p) => hasSuperGate || user.permissions.includes(p),
      );
      if (!allowed) {
        throw new AppError(
          ErrorCodes.FORBIDDEN,
          403,
          'No tienes permisos para esta acción',
        );
      }
    }

    return true;
  }
}
