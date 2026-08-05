import { createHash, randomUUID } from 'node:crypto';
import type { StringValue } from 'ms';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { AppError, ErrorCodes } from '../../common/errors';
import { RolePermissions } from '../../common/permissions';
import { AccessTokenPayload } from '../../common/guards/auth.guard';
import { isValidPassword } from './dto/change-password.dto';
import { AuditService } from '../../shared/audit.service';

export const ACCESS_COOKIE = 'is_session';
export const REFRESH_COOKIE = 'is_refresh';

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
export const PASSWORD_HASH_ROUNDS = 10;

export interface AuthUserView {
  id: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
  factorId: string | null;
}

export interface LoginResult {
  user: AuthUserView;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private get accessSecret(): string {
    return this.configService.get<string>('JWT_ACCESS_SECRET') ?? '';
  }

  private get refreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET') ?? '';
  }

  private toView(user: User): AuthUserView {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      factorId: user.factorId,
    };
  }

  async signAccessToken(user: User): Promise<string> {
    const payload: AccessTokenPayload & { type: 'access' } = {
      type: 'access',
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: [...RolePermissions[user.role]],
      mustChangePassword: user.mustChangePassword,
      factorId: user.factorId,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_TTL',
        '15m',
      ) as StringValue,
    });
  }

  async login(
    email: string,
    password: string,
    ip: string,
  ): Promise<LoginResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);
    const recentFailures = await this.repository.countRecentFailedAttempts(
      normalizedEmail,
      ip,
      since,
    );

    if (recentFailures >= MAX_FAILED_ATTEMPTS) {
      throw new AppError(
        ErrorCodes.ACCOUNT_LOCKED,
        423,
        'Demasiados intentos fallidos. Intenta en 15 minutos.',
      );
    }

    const user = await this.repository.findByEmail(normalizedEmail);
    const passwordOk = user
      ? await compare(password, user.passwordHash)
      : false;

    if (!user || !passwordOk) {
      await this.repository.recordLoginAttempt(normalizedEmail, ip, true);
      throw new AppError(
        ErrorCodes.INVALID_CREDENTIALS,
        401,
        'Credenciales inválidas',
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        ErrorCodes.ACCOUNT_SUSPENDED,
        403,
        'La cuenta está suspendida. Contacta al administrador.',
      );
    }

    await this.repository.clearFailedAttempts(normalizedEmail, ip);

    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user);

    await this.audit.record({
      tableName: 'sessions',
      recordId: this.decodeJti(refreshToken) ?? '',
      operation: 'CREATE',
      actorUserId: user.id,
    });

    return { user: this.toView(user), accessToken, refreshToken };
  }

  private async issueRefreshToken(user: User): Promise<string> {
    const sessionId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: sessionId, type: 'refresh' },
      {
        secret: this.refreshSecret,
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_TTL',
          '7d',
        ) as StringValue,
      },
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.repository.createSession({
      id: sessionId,
      userId: user.id,
      tokenHash: this.sha256(refreshToken),
      expiresAt,
    });
    return refreshToken;
  }

  private decodeJti(token: string): string | null {
    try {
      const payload: unknown = this.jwtService.decode(token);
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('jti' in payload)
      ) {
        return null;
      }
      const jti = payload.jti;
      return typeof jti === 'string' ? jti : null;
    } catch {
      return null;
    }
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    let payload: { sub: string; jti: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync<{
        sub: string;
        jti: string;
        type?: string;
      }>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new AppError(
        ErrorCodes.SESSION_EXPIRED,
        401,
        'Sesión expirada o inválida',
      );
    }

    if (payload.type !== 'refresh') {
      throw new AppError(
        ErrorCodes.SESSION_EXPIRED,
        401,
        'Token de refresco inválido',
      );
    }

    const session = await this.repository.findSessionById(payload.jti);
    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw new AppError(
        ErrorCodes.SESSION_REVOKED,
        401,
        'Sesión revocada. Inicia sesión nuevamente.',
      );
    }

    if (session.tokenHash !== this.sha256(refreshToken)) {
      throw new AppError(
        ErrorCodes.SESSION_REVOKED,
        401,
        'Sesión revocada. Inicia sesión nuevamente.',
      );
    }

    const user = await this.repository.findUserById(payload.sub);
    if (!user) {
      throw new AppError(ErrorCodes.SESSION_REVOKED, 401, 'Usuario no existe.');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        ErrorCodes.ACCOUNT_SUSPENDED,
        403,
        'La cuenta está suspendida',
      );
    }

    // Rotación: revoca la sesión actual y emite una nueva (detección de reuso).
    await this.repository.revokeSession(session.id);

    const accessToken = await this.signAccessToken(user);
    const refreshTokenNew = await this.issueRefreshToken(user);

    await this.audit.record({
      tableName: 'sessions',
      recordId: session.id,
      operation: 'UPDATE',
      actorUserId: user.id,
      newData: { rotated: true },
    });

    return {
      user: this.toView(user),
      accessToken,
      refreshToken: refreshTokenNew,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const jti = this.decodeJti(refreshToken);
    if (jti) {
      await this.repository.revokeSession(jti);
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (!isValidPassword(newPassword)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'La contraseña debe tener 8-72 caracteres, con mayúscula, minúscula y número',
      );
    }
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Usuario no encontrado');
    }
    const currentOk = await compare(currentPassword, user.passwordHash);
    if (!currentOk) {
      throw new AppError(
        ErrorCodes.INVALID_CREDENTIALS,
        401,
        'La contraseña actual es incorrecta',
      );
    }

    const passwordHash = await hash(newPassword, PASSWORD_HASH_ROUNDS);
    await this.repository.updatePassword(userId, passwordHash);
    // Fuerza el re-login: revoca todas las sesiones.
    await this.repository.revokeAllUserSessions(userId);

    await this.audit.record({
      tableName: 'users',
      recordId: userId,
      operation: 'UPDATE',
      actorUserId: userId,
      newData: { passwordChanged: true },
    });
  }
}
