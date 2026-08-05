import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type AuditOperation =
  'CREATE' | 'UPDATE' | 'DELETE' | 'REGISTER_DENIED' | 'SIGN' | 'STATUS_CHANGE';

export interface AuditEntry {
  tableName: string;
  recordId: string;
  operation: AuditOperation;
  actorUserId: string | null;
  oldData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
}

// Escritura de auditoría WORM. Solo INSERT: los triggers de base de datos
// bloquean cualquier UPDATE/DELETE/TRUNCATE sobre audit_logs.
@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma
        .$executeRaw`SELECT set_config('app.actor_user_id', ${entry.actorUserId ?? ''}, true)`;
      await this.prisma.auditLog.create({ data: entry });
    } catch (error) {
      // La auditoría nunca debe romper el flujo principal.
      this.logger.error(
        `No se pudo registrar auditoría para ${entry.tableName}#${entry.recordId}: ${String(error)}`,
      );
    }
  }
}
