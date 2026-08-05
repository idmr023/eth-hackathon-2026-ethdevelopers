import { Injectable } from '@nestjs/common';
import {
  AnomalyType,
  Invoice,
  InvoiceStatus,
  Prisma,
  ValidationType,
} from '@prisma/client';
import { InvoicesRepository, InvoiceWithDetails } from './invoices.repository';
import { CryptoService } from '../../shared/crypto.service';
import { AuditService } from '../../shared/audit.service';
import { AppError, ErrorCodes } from '../../common/errors';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

export interface RegisterInvoiceInput {
  rucEmisor: string;
  rucReceptor: string;
  numero: string;
  monto: number;
  currency?: string;
  factorId?: string;
  metadata?: string;
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly repository: InvoicesRepository,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  async registerInvoice(
    input: RegisterInvoiceInput,
    actor: AuthUser,
  ): Promise<Invoice> {
    const factorId = input.factorId ?? actor.factorId;
    if (!factorId) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'Se requiere un factor para registrar la factura',
      );
    }
    if (
      actor.role !== UserRole.ADMIN &&
      actor.factorId &&
      actor.factorId !== factorId
    ) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        403,
        'No puedes registrar facturas de otro factor',
      );
    }

    const hash = this.crypto.computeInvoiceHash({
      rucEmisor: input.rucEmisor,
      rucReceptor: input.rucReceptor,
      numero: input.numero,
      monto: input.monto.toString(),
    });

    // Detección de doble financiamiento: el hash identifica la factura de forma única.
    const existing = await this.repository.findByHash(hash);
    if (existing) {
      await this.repository.createFraudAlert({
        invoiceHash: hash,
        rucEmisor: input.rucEmisor,
        rucReceptor: input.rucReceptor,
        numero: input.numero,
        monto: new Prisma.Decimal(input.monto),
        existingFactorId: existing.factorId,
        existingInvoiceId: existing.id,
        attemptedFactorId: factorId,
        message: `Intento de doble financiamiento de la factura ${input.numero} (${input.rucEmisor})`,
      });
      await this.audit.record({
        tableName: 'invoices',
        recordId: existing.id,
        operation: 'REGISTER_DENIED',
        actorUserId: actor.id,
        newData: { hash },
      });
      throw new AppError(
        ErrorCodes.FRAUD_DETECTED,
        409,
        `[FRAUDE DETECTADO]: El hash de esta factura ya fue financiado por ${existing.factor.name}. Operación cancelada.`,
        {
          existingInvoiceId: existing.id,
          existingFactorId: existing.factorId,
          hash,
        },
      );
    }

    const invoice = await this.repository.create({
      rucEmisor: input.rucEmisor.trim(),
      rucReceptor: input.rucReceptor.trim(),
      numero: input.numero.trim(),
      monto: new Prisma.Decimal(input.monto),
      currency: input.currency ?? 'PEN',
      hash,
      factorId,
      registeredBy: actor.id,
      metadata: input.metadata ?? null,
    });

    await this.audit.record({
      tableName: 'invoices',
      recordId: invoice.id,
      operation: 'CREATE',
      actorUserId: actor.id,
      newData: {
        hash: invoice.hash,
        status: InvoiceStatus.PENDING,
        factorId: invoice.factorId,
      },
    });

    return invoice;
  }

  async list(
    page?: number,
    limit?: number,
    filters?: { status?: InvoiceStatus; factorId?: string; q?: string },
  ) {
    return this.repository.list(page, limit, filters);
  }

  async listFraudAlerts(page?: number, limit?: number) {
    return this.repository.listFraudAlertsPage(page, limit);
  }

  async detail(
    id: string,
  ): Promise<InvoiceWithDetails & { fraudAlerts: unknown[] }> {
    const invoice = await this.repository.findByIdWithDetails(id);
    if (!invoice) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Factura no encontrada');
    }
    const fraudAlerts = await this.repository.listFraudAlertsForInvoice(id);
    return { ...invoice, fraudAlerts };
  }

  async recordAdapterValidation(
    invoiceId: string,
    type: ValidationType,
    signedBy: string,
    txHash: string | undefined,
    actor: AuthUser,
  ): Promise<Invoice> {
    const invoice = await this.repository.findById(invoiceId);
    if (!invoice) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Factura no encontrada');
    }
    if (invoice.status === InvoiceStatus.BLOCKED) {
      throw new AppError(
        ErrorCodes.INVOICE_BLOCKED,
        409,
        'La factura está bloqueada por una anomalía',
      );
    }
    if (invoice.status === InvoiceStatus.VALIDATED) {
      throw new AppError(
        ErrorCodes.INVOICE_ALREADY_VALIDATED,
        409,
        'La factura ya fue validada',
      );
    }

    await this.repository.upsertValidation(invoiceId, type, signedBy, txHash);
    await this.audit.record({
      tableName: 'validations',
      recordId: invoiceId,
      operation: 'SIGN',
      actorUserId: actor.id,
      newData: { type, signedBy, txHash },
    });

    const validationCount = await this.repository.countValidations(invoiceId);
    let updated = invoice;
    if (validationCount >= 2 && invoice.status === InvoiceStatus.PENDING) {
      // Ambas firmas (SUNAT + CAVALI) presentes → liberación de fondos habilitada.
      updated = await this.repository.updateStatus(
        invoiceId,
        InvoiceStatus.VALIDATED,
      );
      await this.audit.record({
        tableName: 'invoices',
        recordId: invoiceId,
        operation: 'STATUS_CHANGE',
        actorUserId: actor.id,
        newData: { from: InvoiceStatus.PENDING, to: InvoiceStatus.VALIDATED },
      });
    }

    return updated;
  }

  async applyAnomaly(
    invoiceId: string,
    type: AnomalyType,
    detail: string,
    actor: AuthUser,
  ): Promise<Invoice> {
    const invoice = await this.repository.findById(invoiceId);
    if (!invoice) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Factura no encontrada');
    }

    await this.repository.createAnomaly(invoiceId, type, detail);
    const updated = await this.repository.updateStatus(
      invoiceId,
      InvoiceStatus.BLOCKED,
    );

    await this.audit.record({
      tableName: 'anomalies',
      recordId: invoiceId,
      operation: 'CREATE',
      actorUserId: actor.id,
      newData: { type, detail },
    });
    await this.audit.record({
      tableName: 'invoices',
      recordId: invoiceId,
      operation: 'STATUS_CHANGE',
      actorUserId: actor.id,
      newData: {
        from: invoice.status,
        to: InvoiceStatus.BLOCKED,
        reason: type,
      },
    });

    return updated;
  }
}
