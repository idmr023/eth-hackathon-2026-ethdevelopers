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
import { buildOtpAuthUri, generateTotpSecret, verifyTotp } from './totp';
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
  totpEnabled: boolean;
  factorId: string | null;
}

export interface LoginResult {
  user: AuthUserView;
  accessToken: string;
  refreshToken: string;
}

// Resultado del login cuando el usuario tiene 2FA activo: no se emiten
// cookies, se devuelve un JWT efímero (5 min) para completar el segundo paso.
export interface TwoFaChallenge {
  step: 'verify-2fa';
  pendingToken: string;
}

export type LoginOutcome = LoginResult | TwoFaChallenge;

// JWT efímero para el paso 2FA. No abre sesión.
interface PendingTwoFaPayload {
  sub: string;
  type: 'pending-2fa';
  iat: number;
  exp: number;
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
      totpEnabled: user.totpEnabled,
      factorId: user.factorId,
    };
  }

  async signAccessToken(user: User): Promise<string> {
    const payload: AccessTokenPayload & { type: 'access' } = {
      type: 'access',
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: [...RolePermissions[user.role]],
      mustChangePassword: user.mustChangePassword,
      totpEnabled: user.totpEnabled,
      factorId: user.factorId,
      walletAddress: user.walletAddress ?? null,
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
  ): Promise<LoginOutcome> {
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

    // 2FA activo: no emitir sesión. Devolver un JWT efímero (5 min) para el
    // segundo paso. El frontend debe completar POST /auth/login/verify-2fa.
    if (user.totpEnabled && user.totpSecret) {
      const pendingToken = await this.jwtService.signAsync(
        { sub: user.id, type: 'pending-2fa' },
        {
          secret: this.accessSecret,
          expiresIn: '5m' as StringValue,
        },
      );
      return { step: 'verify-2fa', pendingToken };
    }

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

  /**
   * Completa el login 2FA: verifica el código TOTP contra el secreto del
   * usuario y, si es válido, emite la sesión real (access + refresh).
   */
  async verify2fa(pendingToken: string, code: string): Promise<LoginResult> {
    let payload: PendingTwoFaPayload;
    try {
      payload = await this.jwtService.verifyAsync<PendingTwoFaPayload>(
        pendingToken,
        { secret: this.accessSecret },
      );
    } catch {
      throw new AppError(
        ErrorCodes.SESSION_EXPIRED,
        401,
        'El tiempo para el código expiró. Inicia sesión de nuevo.',
      );
    }
    if (payload.type !== 'pending-2fa') {
      throw new AppError(
        ErrorCodes.SESSION_EXPIRED,
        401,
        'Token de verificación inválido.',
      );
    }

    const user = await this.repository.findUserById(payload.sub);
    if (!user || user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        ErrorCodes.ACCOUNT_SUSPENDED,
        403,
        'La cuenta está suspendida.',
      );
    }
    if (!user.totpEnabled || !user.totpSecret) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'La autenticación en dos pasos no está activada.',
      );
    }
    if (!verifyTotp(user.totpSecret, code)) {
      throw new AppError(
        ErrorCodes.INVALID_CREDENTIALS,
        401,
        'El código de verificación es incorrecto.',
      );
    }

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

  // ── Registro de empresas (rol ANALYST) ─────────────────────────────
  async register(input: {
    email: string;
    fullName: string;
    password: string;
    phone?: string;
    dni?: string;
    recoveryQuestion: string;
    recoveryAnswer: string;
  }): Promise<AuthUserView> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.repository.findByEmail(email);
    if (existing) {
      throw new AppError(
        ErrorCodes.CONFLICT,
        409,
        'Ya existe una cuenta con este correo.',
      );
    }
    if (input.dni) {
      const byDni = await this.repository.findUserByDni(input.dni);
      if (byDni) {
        throw new AppError(
          ErrorCodes.CONFLICT,
          409,
          'Ya existe una cuenta con este DNI.',
        );
      }
    }

    const [passwordHash, recoveryAnswerHash] = await Promise.all([
      hash(input.password, PASSWORD_HASH_ROUNDS),
      hash(input.recoveryAnswer.trim().toLowerCase(), PASSWORD_HASH_ROUNDS),
    ]);

    const user = await this.repository.createUser({
      email,
      fullName: input.fullName,
      passwordHash,
      phone: input.phone ?? null,
      dni: input.dni ?? null,
      recoveryQuestion: input.recoveryQuestion,
      recoveryAnswerHash,
    });

    await this.audit.record({
      tableName: 'users',
      recordId: user.id,
      operation: 'CREATE',
      actorUserId: user.id,
      newData: { registered: true, role: user.role },
    });

    return this.toView(user);
  }

  // ── Recuperación de contraseña ─────────────────────────────────────
  /**
   * Devuelve la pregunta de recuperación. Para no filtrar qué correos existen,
   * si el usuario no existe o no tiene pregunta configurada se devuelve un
   * placeholder genérico.
   */
  async recoveryInit(email: string): Promise<{ question: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.repository.findByEmail(normalizedEmail);
    const GENERIC_QUESTION =
      'Para verificar tu identidad, responde tu pregunta de seguridad.';
    return { question: user?.recoveryQuestion ?? GENERIC_QUESTION };
  }

  async recoveryReset(input: {
    email: string;
    answer: string;
    newPassword: string;
  }): Promise<void> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await this.repository.findByEmail(normalizedEmail);

    // Mensaje genérico para no distinguir "usuario no existe" de "respuesta
    // incorrecta" (evitar enumeración). Si no existe, lanzar igual.
    const notFound = new AppError(
      ErrorCodes.INVALID_CREDENTIALS,
      401,
      'La respuesta no coincide o la cuenta no existe.',
    );
    if (!user || !user.recoveryAnswerHash) {
      throw notFound;
    }

    const answerOk = await compare(
      input.answer.trim().toLowerCase(),
      user.recoveryAnswerHash,
    );
    if (!answerOk) {
      throw notFound;
    }

    if (!isValidPassword(input.newPassword)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'La contraseña debe tener 8-72 caracteres, con mayúscula, minúscula y número',
      );
    }

    const passwordHash = await hash(input.newPassword, PASSWORD_HASH_ROUNDS);
    await this.repository.updatePassword(user.id, passwordHash);
    await this.repository.revokeAllUserSessions(user.id);

    await this.audit.record({
      tableName: 'users',
      recordId: user.id,
      operation: 'UPDATE',
      actorUserId: user.id,
      newData: { passwordRecovered: true },
    });
  }

  // ── Autenticación en dos pasos (TOTP) ──────────────────────────────
  /**
   * Genera un secreto TOTP y lo persiste (sin activar todavía). Devuelve la
   * URI otpauth:// para que el frontend renderice el QR con su paquete qrcode
   * existente (sin backend → qrcode dependency).
   */
  async setup2fa(userId: string): Promise<{
    secret: string;
    otpauthUri: string;
  }> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Usuario no encontrado');
    }
    const secret = generateTotpSecret();
    await this.repository.updateUser(userId, { totpSecret: secret });
    const otpauthUri = buildOtpAuthUri({
      secret,
      accountName: user.email,
    });
    await this.audit.record({
      tableName: 'users',
      recordId: userId,
      operation: 'UPDATE',
      actorUserId: userId,
      newData: { totpSetupStarted: true },
    });
    return { secret, otpauthUri };
  }

  async confirm2fa(userId: string, code: string): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user || !user.totpSecret) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'No hay un secreto 2FA pendiente. Inicia la configuración primero.',
      );
    }
    if (!verifyTotp(user.totpSecret, code)) {
      throw new AppError(
        ErrorCodes.INVALID_CREDENTIALS,
        401,
        'El código no es válido. Revisa la hora del dispositivo.',
      );
    }
    await this.repository.updateUser(userId, { totpEnabled: true });
    await this.audit.record({
      tableName: 'users',
      recordId: userId,
      operation: 'UPDATE',
      actorUserId: userId,
      newData: { totpEnabled: true },
    });
  }

  async disable2fa(userId: string, code: string): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'La autenticación en dos pasos no está activada.',
      );
    }
    if (!verifyTotp(user.totpSecret, code)) {
      throw new AppError(
        ErrorCodes.INVALID_CREDENTIALS,
        401,
        'El código no es válido para desactivar 2FA.',
      );
    }
    await this.repository.updateUser(userId, {
      totpEnabled: false,
      totpSecret: null,
    });
    await this.audit.record({
      tableName: 'users',
      recordId: userId,
      operation: 'UPDATE',
      actorUserId: userId,
      newData: { totpEnabled: false },
    });
  }
}
