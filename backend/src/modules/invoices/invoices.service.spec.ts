import { Test } from '@nestjs/testing';
import {
  AnomalyType,
  InvoiceStatus,
  Prisma,
  UserRole,
  ValidationType,
} from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { CryptoService } from '../../shared/crypto.service';
import { AuditService } from '../../shared/audit.service';
import { ErrorCodes } from '../../common/errors';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { computeInvoiceHash } from '../../shared/invoice-hash';
import { ConfigService } from '@nestjs/config';

const adminActor: AuthUser = {
  id: 'user-1',
  email: 'admin@invoiceshield.dev',
  fullName: 'Admin',
  role: UserRole.ADMIN,
  permissions: [],
  mustChangePassword: false,
  totpEnabled: false,
  factorId: null,
};

const analystActor: AuthUser = {
  ...adminActor,
  role: UserRole.ANALYST,
  factorId: 'factor-a',
};

const pendingInvoice = {
  id: 'inv-1',
  rucEmisor: '20123456789',
  rucReceptor: '20512345678',
  numero: 'F001-00000045',
  monto: new Prisma.Decimal(48500),
  currency: 'PEN',
  hash: '0xabc',
  status: InvoiceStatus.PENDING,
  factorId: 'factor-a',
  registeredBy: 'user-1',
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockConfigService = {
  get: () => '0000000000000000000000000000000000000000000000000000000000000000',
} as unknown as ConfigService;

describe('InvoicesService', () => {
  let service: InvoicesService;
  const repository = {
    findByHash: jest.fn(),
    create: jest.fn(),
    createFraudAlert: jest.fn(),
    findById: jest.fn(),
    findByIdWithDetails: jest.fn(),
    listFraudAlertsForInvoice: jest.fn(),
    upsertValidation: jest.fn(),
    countValidations: jest.fn(),
    updateStatus: jest.fn(),
    createAnomaly: jest.fn(),
    list: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const crypto = new CryptoService(mockConfigService);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: InvoicesRepository, useValue: repository },
        { provide: CryptoService, useValue: crypto },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(InvoicesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerInvoice', () => {
    it('calcula el hash server-side y crea la factura en PENDING', async () => {
      repository.findByHash.mockResolvedValue(null);
      repository.create.mockImplementation((data: unknown) =>
        Promise.resolve({
          ...pendingInvoice,
          ...(data as object),
        }),
      );

      const result = await service.registerInvoice(
        {
          rucEmisor: '20123456789',
          rucReceptor: '20512345678',
          numero: 'F001-00000045',
          monto: 48500,
          factorId: 'factor-a',
        },
        adminActor,
      );

      expect(result.status).toBe(InvoiceStatus.PENDING);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: computeInvoiceHash({
            rucEmisor: '20123456789',
            rucReceptor: '20512345678',
            numero: 'F001-00000045',
            monto: '48500',
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'CREATE' }),
      );
    });

    it('exige un factor para registrar', async () => {
      await expect(
        service.registerInvoice(
          {
            rucEmisor: '20123456789',
            rucReceptor: '20512345678',
            numero: 'F001-1',
            monto: 100,
          },
          adminActor,
        ),
      ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR });
    });

    it('un analista no puede registrar facturas de otro factor', async () => {
      await expect(
        service.registerInvoice(
          {
            rucEmisor: '20123456789',
            rucReceptor: '20512345678',
            numero: 'F001-1',
            monto: 100,
            factorId: 'factor-otro',
          },
          analystActor,
        ),
      ).rejects.toMatchObject({ code: ErrorCodes.FORBIDDEN });
    });

    it('detecta doble financiamiento y emite FraudAlert', async () => {
      repository.findByHash.mockResolvedValue({
        id: 'inv-existing',
        factorId: 'factor-a',
        factor: { name: 'Factoring Continental' },
      });

      await expect(
        service.registerInvoice(
          {
            rucEmisor: '20123456789',
            rucReceptor: '20512345678',
            numero: 'F001-00000045',
            monto: 48500,
            factorId: 'factor-b',
          },
          adminActor,
        ),
      ).rejects.toMatchObject({
        code: ErrorCodes.FRAUD_DETECTED,
        statusCode: 409,
      });

      expect(repository.createFraudAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          existingFactorId: 'factor-a',
          attemptedFactorId: 'factor-b',
        }),
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('recordAdapterValidation', () => {
    it('valida la factura al reunir SUNAT + CAVALI', async () => {
      repository.findById.mockResolvedValue(pendingInvoice);
      repository.upsertValidation.mockResolvedValue(undefined);
      repository.countValidations.mockResolvedValue(2);
      repository.updateStatus.mockResolvedValue({
        ...pendingInvoice,
        status: InvoiceStatus.VALIDATED,
      });

      const result = await service.recordAdapterValidation(
        'inv-1',
        ValidationType.CAVALI_FACTRACK,
        'simulated-cavali',
        '0xtx',
        adminActor,
      );

      expect(result.status).toBe(InvoiceStatus.VALIDATED);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'inv-1',
        InvoiceStatus.VALIDATED,
      );
    });

    it('no valida con una sola firma', async () => {
      repository.findById.mockResolvedValue(pendingInvoice);
      repository.upsertValidation.mockResolvedValue(undefined);
      repository.countValidations.mockResolvedValue(1);

      const result = await service.recordAdapterValidation(
        'inv-1',
        ValidationType.SUNAT_CONFORMITY,
        'simulated-sunat',
        '0xtx',
        adminActor,
      );

      expect(result.status).toBe(InvoiceStatus.PENDING);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('bloquea validar facturas con anomalía', async () => {
      repository.findById.mockResolvedValue({
        ...pendingInvoice,
        status: InvoiceStatus.BLOCKED,
      });

      await expect(
        service.recordAdapterValidation(
          'inv-1',
          ValidationType.SUNAT_CONFORMITY,
          'simulated-sunat',
          '0xtx',
          adminActor,
        ),
      ).rejects.toMatchObject({ code: ErrorCodes.INVOICE_BLOCKED });
    });

    it('no permite revalidar una factura ya validada', async () => {
      repository.findById.mockResolvedValue({
        ...pendingInvoice,
        status: InvoiceStatus.VALIDATED,
      });

      await expect(
        service.recordAdapterValidation(
          'inv-1',
          ValidationType.SUNAT_CONFORMITY,
          'simulated-sunat',
          '0xtx',
          adminActor,
        ),
      ).rejects.toMatchObject({ code: ErrorCodes.INVOICE_ALREADY_VALIDATED });
    });
  });

  describe('applyAnomaly', () => {
    it('registra la anomalía y bloquea la factura', async () => {
      repository.findById.mockResolvedValue(pendingInvoice);
      repository.createAnomaly.mockResolvedValue(undefined);
      repository.updateStatus.mockResolvedValue({
        ...pendingInvoice,
        status: InvoiceStatus.BLOCKED,
      });

      const result = await service.applyAnomaly(
        'inv-1',
        AnomalyType.CREDIT_NOTE,
        'Nota de crédito posterior',
        adminActor,
      );

      expect(result.status).toBe(InvoiceStatus.BLOCKED);
      expect(repository.createAnomaly).toHaveBeenCalledWith(
        'inv-1',
        AnomalyType.CREDIT_NOTE,
        'Nota de crédito posterior',
      );
    });
  });
});
