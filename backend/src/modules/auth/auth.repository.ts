import { Injectable } from '@nestjs/common';
import { Prisma, Session, User, UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/prisma.service';

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
}

const SESSION_SELECT = {
  id: true,
  userId: true,
  tokenHash: true,
  expiresAt: true,
  revoked: true,
} satisfies Prisma.SessionSelect;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findUserByDni(dni: string): Promise<Pick<User, 'id'> | null> {
    return this.prisma.user.findFirst({
      where: { dni },
      select: { id: true },
    });
  }

  async createSession(data: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  async findSessionById(id: string): Promise<SessionRecord | null> {
    return this.prisma.session.findUnique({
      where: { id },
      select: SESSION_SELECT,
    });
  }

  async revokeSession(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { revoked: true },
    });
  }

  async revokeAllUserSessions(
    userId: string,
    exceptId?: string,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revoked: false,
        NOT: exceptId ? { id: exceptId } : undefined,
      },
      data: { revoked: true },
    });
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async recordLoginAttempt(
    email: string,
    ip: string,
    failed: boolean,
  ): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: { email: email.toLowerCase().trim(), ip, failed },
    });
  }

  async countRecentFailedAttempts(
    email: string,
    ip: string,
    since: Date,
  ): Promise<number> {
    return this.prisma.loginAttempt.count({
      where: {
        email: email.toLowerCase().trim(),
        ip,
        failed: true,
        createdAt: { gte: since },
      },
    });
  }

  async clearFailedAttempts(email: string, ip: string): Promise<void> {
    await this.prisma.loginAttempt.deleteMany({
      where: { email: email.toLowerCase().trim(), ip, failed: true },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
  }

  async createUser(data: {
    email: string;
    fullName: string;
    passwordHash: string;
    phone?: string | null;
    dni?: string | null;
    recoveryQuestion: string;
    recoveryAnswerHash: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        role: UserRole.ANALYST,
        mustChangePassword: false,
        phone: data.phone ?? null,
        dni: data.dni ?? null,
        recoveryQuestion: data.recoveryQuestion,
        recoveryAnswerHash: data.recoveryAnswerHash,
      },
    });
  }

  async updateUser(
    userId: string,
    data: Prisma.UserUpdateInput,
  ): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data });
  }
}
