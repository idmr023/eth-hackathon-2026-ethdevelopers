import { Test } from '@nestjs/testing';
import { ValidationType } from '@prisma/client';
import { AdaptersService } from './adapters.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ResilienceService } from '../../shared/resilience.service';
import { CryptoService } from '../../shared/crypto.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

describe('AdaptersService', () => {
  let service: AdaptersService;
  const resilience = new ResilienceService();
  const crypto = new CryptoService();
  const invoicesService = {
    recordAdapterValidation: jest.fn(),
    detail: jest.fn(),
  };

  const actor: AuthUser = {
    id: 'user-1',
    email: 'analista@continental.pe',
    role: 'ANALYST',
    permissions: [],
    mustChangePassword: false,
    factorId: 'factor-a',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdaptersService,
        { provide: InvoicesService, useValue: invoicesService },
        { provide: ResilienceService, useValue: resilience },
        { provide: CryptoService, useValue: crypto },
      ],
    }).compile();
    service = moduleRef.get(AdaptersService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('firma vía adaptador SUNAT y registra la validación', async () => {
    invoicesService.recordAdapterValidation.mockResolvedValue(undefined);
    invoicesService.detail.mockResolvedValue({ id: 'inv-1' });

    const result = await service.signByAdapter(
      'inv-1',
      'simulated-sunat',
      actor,
    );

    expect(result.signedBy).toBe('simulated-sunat');
    expect(result.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(invoicesService.recordAdapterValidation).toHaveBeenCalledWith(
      'inv-1',
      ValidationType.SUNAT_CONFORMITY,
      'simulated-sunat',
      expect.stringMatching(/^0x/),
      actor,
    );
  });

  it('firma vía adaptador CAVALI', async () => {
    invoicesService.recordAdapterValidation.mockResolvedValue(undefined);
    invoicesService.detail.mockResolvedValue({ id: 'inv-1' });

    const result = await service.signByAdapter(
      'inv-1',
      'simulated-cavali',
      actor,
    );

    expect(result.signedBy).toBe('simulated-cavali');
    expect(invoicesService.recordAdapterValidation).toHaveBeenCalledWith(
      'inv-1',
      ValidationType.CAVALI_FACTRACK,
      'simulated-cavali',
      expect.stringMatching(/^0x/),
      actor,
    );
  });

  it('rechaza adaptadores desconocidos', async () => {
    await expect(
      service.signByAdapter('inv-1', 'oraculo-inexistente', actor),
    ).rejects.toThrow('Adaptador no registrado');
    expect(invoicesService.recordAdapterValidation).not.toHaveBeenCalled();
  });

  it('expone el estado del portal como simulado', () => {
    const statuses = service.portalStatus();
    expect(statuses).toHaveLength(2);
    for (const s of statuses) {
      expect(s.connected).toBe(true);
      expect(s.source).toBe('simulated');
    }
  });
});
