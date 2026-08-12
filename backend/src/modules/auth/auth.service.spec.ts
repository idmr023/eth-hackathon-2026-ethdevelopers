import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { User, UserStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuthService, PASSWORD_HASH_ROUNDS } from './auth.service';
import { AuthRepository } from './auth.repository';
import { ErrorCodes } from '../../common/errors';
import { AuditService } from '../../shared/audit.service';
import { generateTotp, generateTotpSecret } from './totp';

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const ACCESS_SECRET = 'a'.repeat(32);
const REFRESH_SECRET = 'b'.repeat(32);

const baseUser = {
  id: 'user-1',
  email: 'admin@invoiceshield.dev',
  fullName: 'Admin',
  passwordHash: '',
  role: 'ADMIN',
  status: UserStatus.ACTIVE,
  mustChangePassword: false,
  phone: null,
  dni: null,
  recoveryQuestion: null,
  recoveryAnswerHash: null,
  totpSecret: null,
  totpEnabled: false,
  factorId: null,
  walletAddress: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies User;

describe('AuthService', () => {
  let service: AuthService;
  const repository = {
    countRecentFailedAttempts: jest.fn(),
    findByEmail: jest.fn(),
    findUserByDni: jest.fn(),
    findUserById: jest.fn(),
    recordLoginAttempt: jest.fn(),
    clearFailedAttempts: jest.fn(),
    createSession: jest.fn(),
    findSessionById: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    updatePassword: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: ACCESS_SECRET,
        JWT_REFRESH_SECRET: REFRESH_SECRET,
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '7d',
      };
      return values[key] ?? defaultValue;
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: repository },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('rechaza con ACCOUNT_LOCKED tras 5 intentos fallidos', async () => {
      repository.countRecentFailedAttempts.mockResolvedValue(5);
      await expect(
        service.login('a@b.pe', 'WrongPass1', '1.1.1.1'),
      ).rejects.toMatchObject({
        code: ErrorCodes.ACCOUNT_LOCKED,
      });
      expect(repository.findByEmail).not.toHaveBeenCalled();
    });

    it('rechaza credenciales inválidas y registra el intento', async () => {
      repository.countRecentFailedAttempts.mockResolvedValue(0);
      repository.findByEmail.mockResolvedValue({
        ...baseUser,
        passwordHash: await hash('Correct1', PASSWORD_HASH_ROUNDS),
      });
      await expect(
        service.login('a@b.pe', 'WrongPass1', '1.1.1.1'),
      ).rejects.toMatchObject({
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
      expect(repository.recordLoginAttempt).toHaveBeenCalledWith(
        'a@b.pe',
        '1.1.1.1',
        true,
      );
    });

    it('rechaza cuentas suspendidas', async () => {
      repository.countRecentFailedAttempts.mockResolvedValue(0);
      repository.findByEmail.mockResolvedValue({
        ...baseUser,
        status: UserStatus.SUSPENDED,
        passwordHash: await hash('Correct1', PASSWORD_HASH_ROUNDS),
      });
      await expect(
        service.login('a@b.pe', 'Correct1', '1.1.1.1'),
      ).rejects.toMatchObject({
        code: ErrorCodes.ACCOUNT_SUSPENDED,
      });
    });

    it('loguea correctamente y emite access + refresh', async () => {
      const user = {
        ...baseUser,
        passwordHash: await hash('Correct1', PASSWORD_HASH_ROUNDS),
      };
      repository.countRecentFailedAttempts.mockResolvedValue(0);
      repository.findByEmail.mockResolvedValue(user);
      repository.createSession.mockResolvedValue(undefined);
      jwt.signAsync.mockResolvedValue('token');
      jwt.decode.mockReturnValue({ jti: 'session-1', type: 'refresh' });

      const result = await service.login(
        'ADMIN@invoiceshield.dev',
        'Correct1',
        '1.1.1.1',
      );

      // totpEnabled:false → LoginResult (no desafío 2FA).
      if (!('accessToken' in result)) {
        throw new Error('Se esperaba un LoginResult, no un desafío 2FA');
      }
      expect(result.accessToken).toBe('token');
      expect(result.refreshToken).toBe('token');
      expect(result.user.email).toBe('admin@invoiceshield.dev');
      expect(repository.clearFailedAttempts).toHaveBeenCalled();
      expect(repository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          tokenHash: sha256('token'),
        }),
      );
      expect(audit.record).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('revoca y rota la sesión reutilizada (tokens single-use)', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        jti: 'session-1',
        type: 'refresh',
      });
      jwt.signAsync.mockResolvedValue('token');
      repository.findSessionById.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: sha256('rotated-token'),
        expiresAt: new Date(Date.now() + 60_000),
        revoked: false,
      });
      repository.findUserById.mockResolvedValue(baseUser);

      const result = await service.refresh('rotated-token');

      expect(repository.revokeSession).toHaveBeenCalledWith('session-1');
      expect(repository.createSession).toHaveBeenCalled();
      expect(result.refreshToken).toBe('token');
    });

    it('rechaza sesiones revocadas', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        jti: 'session-1',
        type: 'refresh',
      });
      repository.findSessionById.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: 'x',
        expiresAt: new Date(Date.now() + 60_000),
        revoked: true,
      });
      await expect(service.refresh('t')).rejects.toMatchObject({
        code: ErrorCodes.SESSION_REVOKED,
      });
    });

    it('rechaza tokens cuyo hash no coincide con la sesión (reuso)', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        jti: 'session-1',
        type: 'refresh',
      });
      const realHash = sha256('real-token');
      repository.findSessionById.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: realHash,
        expiresAt: new Date(Date.now() + 60_000),
        revoked: false,
      });
      await expect(service.refresh('stolen-token')).rejects.toMatchObject({
        code: ErrorCodes.SESSION_REVOKED,
      });
    });

    it('rechaza tokens que no son de tipo refresh', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        jti: 'session-1',
        type: 'access',
      });
      await expect(service.refresh('t')).rejects.toMatchObject({
        code: ErrorCodes.SESSION_EXPIRED,
      });
    });
  });

  describe('changePassword', () => {
    it('valida la fortaleza de la nueva contraseña', async () => {
      await expect(
        service.changePassword('u', 'OldPass1', 'weak'),
      ).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_ERROR,
      });
    });

    it('rechaza si la contraseña actual es incorrecta', async () => {
      repository.findUserById.mockResolvedValue({
        ...baseUser,
        passwordHash: await hash('OldPass1', PASSWORD_HASH_ROUNDS),
      });
      await expect(
        service.changePassword('user-1', 'WrongOld1', 'NewPass123'),
      ).rejects.toMatchObject({
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    });

    it('actualiza el hash y revoca todas las sesiones', async () => {
      repository.findUserById.mockResolvedValue({
        ...baseUser,
        passwordHash: await hash('OldPass1', PASSWORD_HASH_ROUNDS),
      });
      repository.updatePassword.mockResolvedValue(baseUser);
      repository.revokeAllUserSessions.mockResolvedValue({ count: 1 });

      await service.changePassword('user-1', 'OldPass1', 'NewPass123');

      expect(repository.updatePassword).toHaveBeenCalledWith(
        'user-1',
        expect.not.stringMatching(/^OldPass1$/),
      );
      expect(repository.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
    });
  });

  describe('register', () => {
    it('crea un usuario ANALYST con mustChangePassword false', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findUserByDni.mockResolvedValue(null);
      repository.createUser.mockResolvedValue({
        ...baseUser,
        role: 'ANALYST',
      });

      const view = await service.register({
        email: 'nuevo@empresa.pe',
        fullName: 'Empresa Nueva',
        password: 'Empresa123',
        dni: '12345678',
        recoveryQuestion: '¿Mascota?',
        recoveryAnswer: 'Firulais',
      });

      expect(view.role).toBe('ANALYST');
      expect(view.totpEnabled).toBe(false);
      expect(repository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'nuevo@empresa.pe',
          dni: '12345678',
        }),
      );
    });

    it('rechaza email duplicado con CONFLICT', async () => {
      repository.findByEmail.mockResolvedValue(baseUser);
      await expect(
        service.register({
          email: 'admin@invoiceshield.dev',
          fullName: 'Dup',
          password: 'Empresa123',
          recoveryQuestion: 'q',
          recoveryAnswer: 'a',
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.CONFLICT });
      expect(repository.createUser).not.toHaveBeenCalled();
    });

    it('rechaza DNI duplicado con CONFLICT', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findUserByDni.mockResolvedValue({ id: 'otro' });
      await expect(
        service.register({
          email: 'nuevo@empresa.pe',
          fullName: 'Dup',
          password: 'Empresa123',
          dni: '12345678',
          recoveryQuestion: 'q',
          recoveryAnswer: 'a',
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.CONFLICT });
    });
  });

  describe('recovery', () => {
    it('recoveryInit devuelve la pregunta del usuario', async () => {
      repository.findByEmail.mockResolvedValue({
        ...baseUser,
        recoveryQuestion: '¿Color favorito?',
      });
      const res = await service.recoveryInit('admin@invoiceshield.dev');
      expect(res.question).toBe('¿Color favorito?');
    });

    it('recoveryInit devuelve placeholder genérico si no existe', async () => {
      repository.findByEmail.mockResolvedValue(null);
      const res = await service.recoveryInit('nadie@x.pe');
      expect(res.question.length).toBeGreaterThan(0);
    });

    it('recoveryReset actualiza la contraseña y revoca sesiones', async () => {
      repository.findByEmail.mockResolvedValue({
        ...baseUser,
        recoveryAnswerHash: await hash('firulais', PASSWORD_HASH_ROUNDS),
      });
      repository.updatePassword.mockResolvedValue(undefined);
      repository.revokeAllUserSessions.mockResolvedValue({ count: 1 });

      await service.recoveryReset({
        email: 'admin@invoiceshield.dev',
        answer: 'Firulais',
        newPassword: 'Nuevo123',
      });

      expect(repository.updatePassword).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
      );
      expect(repository.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
    });

    it('recoveryReset rechaza respuesta incorrecta', async () => {
      repository.findByEmail.mockResolvedValue({
        ...baseUser,
        recoveryAnswerHash: await hash('firulais', PASSWORD_HASH_ROUNDS),
      });
      await expect(
        service.recoveryReset({
          email: 'admin@invoiceshield.dev',
          answer: 'incorrecto',
          newPassword: 'Nuevo123',
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.INVALID_CREDENTIALS });
    });
  });

  describe('2FA', () => {
    it('setup2fa genera secreto y URI otpauth', async () => {
      repository.findUserById.mockResolvedValue(baseUser);
      repository.updateUser.mockResolvedValue(baseUser);
      const res = await service.setup2fa('user-1');
      expect(res.secret.length).toBeGreaterThan(0);
      expect(res.otpauthUri.startsWith('otpauth://totp/')).toBe(true);
      expect(repository.updateUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ totpSecret: expect.any(String) }),
      );
    });

    it('login con totpEnabled devuelve desafío verify-2fa (sin sesión)', async () => {
      const user = {
        ...baseUser,
        totpEnabled: true,
        totpSecret: 'JBSWY3DPEHPK3PXP',
        passwordHash: await hash('Correct1', PASSWORD_HASH_ROUNDS),
      };
      repository.countRecentFailedAttempts.mockResolvedValue(0);
      repository.findByEmail.mockResolvedValue(user);
      jwt.signAsync.mockResolvedValue('pending-token');

      const result = await service.login(
        'admin@invoiceshield.dev',
        'Correct1',
        '1.1.1.1',
      );

      if ('accessToken' in result) {
        throw new Error('Se esperaba desafío 2FA');
      }
      expect(result.step).toBe('verify-2fa');
      expect(result.pendingToken).toBe('pending-token');
      expect(repository.createSession).not.toHaveBeenCalled();
    });

    it('confirm2fa con código correcto activa 2FA', async () => {
      const secret = generateTotpSecret();
      const code = generateTotp(secret);
      repository.findUserById.mockResolvedValue({
        ...baseUser,
        totpSecret: secret,
      });
      repository.updateUser.mockResolvedValue(baseUser);

      await service.confirm2fa('user-1', code);

      expect(repository.updateUser).toHaveBeenCalledWith('user-1', {
        totpEnabled: true,
      });
    });

    it('disable2fa con código correcto desactiva y limpia el secreto', async () => {
      const secret = generateTotpSecret();
      const code = generateTotp(secret);
      repository.findUserById.mockResolvedValue({
        ...baseUser,
        totpEnabled: true,
        totpSecret: secret,
      });
      repository.updateUser.mockResolvedValue(baseUser);

      await service.disable2fa('user-1', code);

      expect(repository.updateUser).toHaveBeenCalledWith('user-1', {
        totpEnabled: false,
        totpSecret: null,
      });
    });
  });
});
