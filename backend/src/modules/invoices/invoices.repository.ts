import { Injectable } from '@nestjs/common';
import {
  AnomalyType,
  Factor,
  Invoice,
  InvoiceStatus,
  Prisma,
  ValidationType,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma.service';
import { safePage, safeLimit } from '../../common/dto/pagination.dto';

export interface InvoiceListFilters {
  status?: InvoiceStatus;
  factorId?: string;
  q?: string;
}

export interface InvoiceListResult {
  rows: Invoice[];
  total: number;
}

const INVOICE_DETAIL_INCLUDE = {
  factor: true,
  validations: { orderBy: { createdAt: 'asc' as const } },
  anomalies: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
  include: typeof INVOICE_DETAIL_INCLUDE;
}>;

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByHash(
    hash: string,
  ): Promise<(Invoice & { factor: Factor }) | null> {
    return this.prisma.invoice.findUnique({
      where: { hash },
      include: { factor: true },
    });
  }

  async create(data: {
    rucEmisor: string;
    rucReceptor: string;
    numero: string;
    monto: Prisma.Decimal;
    currency: string;
    hash: string;
    factorId: string;
    registeredBy: string;
    metadata?: string | null;
  }): Promise<Invoice> {
    return this.prisma.invoice.create({ data });
  }

  async findByIdWithDetails(id: string): Promise<InvoiceWithDetails | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_DETAIL_INCLUDE,
    });
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({ where: { id } });
  }

  async list(
    page?: number,
    limit?: number,
    filters: InvoiceListFilters = {},
  ): Promise<InvoiceListResult> {
    const where: Prisma.InvoiceWhereInput = {
      status: filters.status,
      factorId: filters.factorId,
      OR: filters.q
        ? [
            { rucEmisor: { contains: filters.q } },
            { rucReceptor: { contains: filters.q } },
            { numero: { contains: filters.q } },
          ]
        : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage(page) - 1) * safeLimit(limit),
        take: safeLimit(limit),
        include: { factor: true, validations: true, anomalies: true },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { rows, total };
  }

  async listRecent(limit = 8): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { factor: true },
    });
  }

  async upsertValidation(
    invoiceId: string,
    type: ValidationType,
    signedBy: string,
    txHash?: string,
  ): Promise<void> {
    await this.prisma.validation.upsert({
      where: { invoiceId_type: { invoiceId, type } },
      create: { invoiceId, type, signedBy, txHash },
      update: { signedBy, txHash },
    });
  }

  async countValidations(invoiceId: string): Promise<number> {
    return this.prisma.validation.count({ where: { invoiceId } });
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    return this.prisma.invoice.update({ where: { id }, data: { status } });
  }

  async createAnomaly(
    invoiceId: string,
    type: AnomalyType,
    detail: string,
  ): Promise<void> {
    await this.prisma.anomaly.create({ data: { invoiceId, type, detail } });
  }

  async createFraudAlert(data: {
    invoiceHash: string;
    rucEmisor: string;
    rucReceptor: string;
    numero: string;
    monto: Prisma.Decimal;
    existingFactorId: string;
    existingInvoiceId: string;
    attemptedFactorId: string;
    message: string;
  }): Promise<void> {
    await this.prisma.fraudAlert.create({ data });
  }

  async listFraudAlertsForInvoice(
    existingInvoiceId: string,
  ): Promise<unknown[]> {
    return this.prisma.fraudAlert.findMany({
      where: { existingInvoiceId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { existingFactor: true, attemptedFactor: true },
    });
  }

  async listFraudAlerts(limit = 20): Promise<unknown[]> {
    return this.prisma.fraudAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { existingFactor: true, attemptedFactor: true },
    });
  }

  async listFraudAlertsPage(page?: number, limit?: number) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fraudAlert.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (safePage(page) - 1) * safeLimit(limit),
        take: safeLimit(limit),
        include: { existingFactor: true, attemptedFactor: true },
      }),
      this.prisma.fraudAlert.count(),
    ]);
    return { rows, total };
  }

  async counts(): Promise<{
    total: number;
    byStatus: Record<InvoiceStatus, number>;
    fraudAlerts: number;
  }> {
    const [total, pending, validated, blocked, fraudAlerts] =
      await this.prisma.$transaction([
        this.prisma.invoice.count(),
        this.prisma.invoice.count({ where: { status: InvoiceStatus.PENDING } }),
        this.prisma.invoice.count({
          where: { status: InvoiceStatus.VALIDATED },
        }),
        this.prisma.invoice.count({ where: { status: InvoiceStatus.BLOCKED } }),
        this.prisma.fraudAlert.count(),
      ]);
    return {
      total,
      byStatus: {
        [InvoiceStatus.PENDING]: pending,
        [InvoiceStatus.VALIDATED]: validated,
        [InvoiceStatus.BLOCKED]: blocked,
      },
      fraudAlerts,
    };
  }
}
