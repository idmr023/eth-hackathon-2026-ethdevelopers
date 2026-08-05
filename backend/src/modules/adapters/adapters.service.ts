import { Injectable } from '@nestjs/common';
import { ValidationType } from '@prisma/client';
import { InvoicesService } from '../invoices/invoices.service';
import { ResilienceService } from '../../shared/resilience.service';
import { CryptoService } from '../../shared/crypto.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

export interface AdapterSignResult {
  txHash: string;
  signedBy: string;
  message: string;
  invoice: Awaited<ReturnType<InvoicesService['detail']>>;
}

export interface AdapterPortalStatus {
  provider: string;
  connected: boolean;
  source: 'simulated' | 'real';
  lastSyncAt: string;
  detail: string;
}

// Interfaz de adaptador reemplazable por oráculos reales (SUNAT/CAVALI).
export interface InvoiceAdapter {
  readonly name: string;
  readonly type: ValidationType;
  sign(invoiceId: string): { txHash: string; signedBy: string };
}

const SIMULATED_LATENCY_MS = 1400;

@Injectable()
export class AdaptersService {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly resilience: ResilienceService,
    private readonly crypto: CryptoService,
  ) {}

  private adapters: InvoiceAdapter[] = [
    {
      name: 'simulated-sunat',
      type: ValidationType.SUNAT_CONFORMITY,
      sign: (invoiceId) => ({
        txHash: this.crypto.keccak256Hex(`sunat|${invoiceId}|${Date.now()}`),
        signedBy: 'simulated-sunat',
      }),
    },
    {
      name: 'simulated-cavali',
      type: ValidationType.CAVALI_FACTRACK,
      sign: (invoiceId) => ({
        txHash: this.crypto.keccak256Hex(`cavali|${invoiceId}|${Date.now()}`),
        signedBy: 'simulated-cavali',
      }),
    },
  ];

  async signByAdapter(
    invoiceId: string,
    adapterName: string,
    actor: AuthUser,
  ): Promise<AdapterSignResult> {
    const adapter = this.adapters.find((a) => a.name === adapterName);
    if (!adapter) {
      throw new Error(`Adaptador no registrado: ${adapterName}`);
    }

    // Simula la latencia de red del oráculo.
    await this.resilience.withRetry(
      () =>
        new Promise<void>((resolve) =>
          setTimeout(resolve, SIMULATED_LATENCY_MS),
        ),
      { attempts: 1 },
    );

    const { txHash, signedBy } = adapter.sign(invoiceId);
    await this.invoicesService.recordAdapterValidation(
      invoiceId,
      adapter.type,
      signedBy,
      txHash,
      actor,
    );

    const label =
      adapter.type === ValidationType.SUNAT_CONFORMITY ? 'SUNAT' : 'CAVALI';
    return {
      txHash,
      signedBy,
      message: `Conformidad ${label} firmada y registrada on-chain`,
      invoice: await this.invoicesService.detail(invoiceId),
    };
  }

  portalStatus(): AdapterPortalStatus[] {
    const now = new Date().toISOString();
    return [
      {
        provider: 'SUNAT',
        connected: true,
        source: 'simulated',
        lastSyncAt: now,
        detail: 'Ventana de disconformidad de 8 días calendario monitoreada',
      },
      {
        provider: 'CAVALI',
        connected: true,
        source: 'simulated',
        lastSyncAt: now,
        detail: 'Anotación de cuenta Factrack sincronizada',
      },
    ];
  }
}
