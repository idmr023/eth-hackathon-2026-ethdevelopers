import { Injectable } from '@nestjs/common';
import { Factor, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma.service';
import { safePage, safeLimit } from '../../common/dto/pagination.dto';
import { AppError, ErrorCodes } from '../../common/errors';

export interface FactorListResult {
  rows: Factor[];
  total: number;
}

@Injectable()
export class FactorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    page?: number,
    limit?: number,
    q?: string,
  ): Promise<FactorListResult> {
    const where: Prisma.FactorWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { ruc: { contains: q } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.factor.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (safePage(page) - 1) * safeLimit(limit),
        take: safeLimit(limit),
      }),
      this.prisma.factor.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id: string): Promise<Factor | null> {
    return this.prisma.factor.findUnique({ where: { id } });
  }

  async findByRuc(ruc: string): Promise<Factor | null> {
    return this.prisma.factor.findUnique({ where: { ruc } });
  }

  async create(data: { name: string; ruc: string }): Promise<Factor> {
    return this.prisma.factor.create({ data });
  }

  async assertExists(id: string): Promise<Factor> {
    const factor = await this.findById(id);
    if (!factor) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Factor no encontrado');
    }
    return factor;
  }
}
