import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/rbac.decorators';
import { AppError, ErrorCodes } from '../errors';
import { AuthUser } from '../decorators/current-user.decorator';
import { RolePermissions } from '../permissions';
import type { AuthenticatedRequest } from '../auth-request';

// Rutas permitidas cuando el usuario debe cambiar su contraseña.
const MUST_CHANGE_ALLOWLIST = [
  '/api/auth/me',
  '/api/auth/change-password',
  '/api/auth/logout',
  '/api/auth/refresh',
];

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
  factorId: string | null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.is_session;

    if (!token) {
      throw new AppError(
        ErrorCodes.AUTH_REQUIRED,
        401,
        'Autenticación requerida',
      );
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new AppError(
        ErrorCodes.SESSION_EXPIRED,
        401,
        'Sesión expirada o inválida',
      );
    }

    // Puerta de cambio de contraseña obligatorio.
    if (payload.mustChangePassword) {
      const path = request.originalUrl ?? request.url;
      if (!MUST_CHANGE_ALLOWLIST.includes(path)) {
        throw new AppError(
          ErrorCodes.MUST_CHANGE_PASSWORD,
          403,
          'Debes cambiar tu contraseña antes de continuar',
        );
      }
    }

    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions ?? RolePermissions.ANALYST.slice(),
      mustChangePassword: payload.mustChangePassword,
      factorId: payload.factorId ?? null,
    };
    request.user = user;
    return true;
  }
}
