import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../shared/prisma.service';
import { safePage, safeLimit } from '../../common/dto/pagination.dto';
import { AppError, ErrorCodes } from '../../common/errors';
import { AuditService } from '../../shared/audit.service';
import { PASSWORD_HASH_ROUNDS } from '../auth/auth.service';
import { isValidPassword } from '../auth/dto/change-password.dto';

export interface UserListResult {
  rows: User[];
  total: number;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    page?: number,
    limit?: number,
    q?: string,
  ): Promise<UserListResult> {
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage(page) - 1) * safeLimit(limit),
        take: safeLimit(limit),
      }),
      this.prisma.user.count({ where }),
    ]);
    return { rows, total };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    fullName: string;
    passwordHash: string;
    role: UserRole;
    factorId: string | null;
    mustChangePassword: boolean;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { status } });
  }
}

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async list(page?: number, limit?: number, q?: string) {
    const result = await this.repository.list(page, limit, q);
    const rows = result.rows.map((row) => {
      const { passwordHash: _passwordHash, ...user } = row;
      void _passwordHash;
      return user;
    });
    return { rows, total: result.total };
  }

  async createUser(input: {
    email: string;
    fullName: string;
    password: string;
    role: UserRole;
    factorId?: string | null;
    actorUserId: string;
  }): Promise<User> {
    const email = input.email.toLowerCase().trim();
    if (!isValidPassword(input.password)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'La contraseña debe tener 8-72 caracteres, con mayúscula, minúscula y número',
      );
    }
    const existing = await this.repository.findByEmail(email);
    if (existing) {
      throw new AppError(
        ErrorCodes.CONFLICT,
        409,
        'Ya existe un usuario con ese correo',
      );
    }
    const passwordHash = await hash(input.password, PASSWORD_HASH_ROUNDS);
    const user = await this.repository.create({
      email,
      fullName: input.fullName.trim(),
      passwordHash,
      role: input.role,
      factorId: input.factorId ?? null,
      mustChangePassword: true,
    });
    await this.audit.record({
      tableName: 'users',
      recordId: user.id,
      operation: 'CREATE',
      actorUserId: input.actorUserId,
      newData: { email: user.email, role: user.role },
    });
    return user;
  }

  async updateStatus(
    id: string,
    status: UserStatus,
    actorUserId: string,
  ): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Usuario no encontrado');
    }
    const updated = await this.repository.updateStatus(id, status);
    await this.audit.record({
      tableName: 'users',
      recordId: id,
      operation: 'UPDATE',
      actorUserId,
      newData: { status },
    });
    return updated;
  }
}
