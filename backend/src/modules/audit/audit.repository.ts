import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma.service';
import { safePage, safeLimit } from '../../common/dto/pagination.dto';

export interface AuditQueryFilters {
  tableName?: string;
  operation?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(page?: number, limit?: number, filters: AuditQueryFilters = {}) {
    const where: Prisma.AuditLogWhereInput = {
      tableName: filters.tableName,
      operation: filters.operation,
      createdAt: {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined,
      },
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage(page) - 1) * safeLimit(limit),
        take: safeLimit(limit),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    // `id` es BigInt en Prisma y JSON.stringify no lo serializa (TypeError).
    // Se expone como string para que la API y el frontend sean JSON-safe.
    const safeRows = rows.map((row) => ({ ...row, id: row.id.toString() }));
    return { rows: safeRows, total };
  }
}
