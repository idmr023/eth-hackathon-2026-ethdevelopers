import { Injectable } from '@nestjs/common';
import { Factor } from '@prisma/client';
import { FactorsRepository } from './factors.repository';
import { AppError, ErrorCodes } from '../../common/errors';
import { AuditService } from '../../shared/audit.service';

@Injectable()
export class FactorsService {
  constructor(
    private readonly repository: FactorsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(page?: number, limit?: number, q?: string) {
    return this.repository.list(page, limit, q);
  }

  async create(
    name: string,
    ruc: string,
    actorUserId: string,
  ): Promise<Factor> {
    const normalizedRuc = ruc.trim();
    if (!/^\d{11}$/.test(normalizedRuc)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'El RUC debe tener exactamente 11 dígitos',
      );
    }
    const existing = await this.repository.findByRuc(normalizedRuc);
    if (existing) {
      throw new AppError(
        ErrorCodes.CONFLICT,
        409,
        'Ya existe un factor con ese RUC',
      );
    }
    const factor = await this.repository.create({
      name: name.trim(),
      ruc: normalizedRuc,
    });
    await this.audit.record({
      tableName: 'factors',
      recordId: factor.id,
      operation: 'CREATE',
      actorUserId,
      newData: { name: factor.name, ruc: factor.ruc },
    });
    return factor;
  }
}
