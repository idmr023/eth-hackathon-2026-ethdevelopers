import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

export interface StoredProposal {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

// Almacenamiento de propuestas PDF en binario (BYTEA) dentro de la propia
// base de datos Neon (tabla proposal_document). No depende de S3/MinIO ni de
// disco local: sobrevive a los reinicios efímeros de Render y no requiere
// variables de infraestructura extra.
@Injectable()
export class ProposalStorageService {
  private readonly logger = new Logger(ProposalStorageService.name);

  constructor(private readonly prisma: PrismaService) {
    this.logger.log('Almacenamiento de propuestas en base de datos (BYTEA)');
  }

  get enabled(): boolean {
    return true;
  }

  key(licitacionId: string, providerId: string): string {
    return `licitaciones/${licitacionId}/${providerId}.pdf`;
  }

  async upload(
    licitacionId: string,
    providerId: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const data = new Uint8Array(buffer);
    await this.prisma.proposalDocument.upsert({
      where: {
        proposal_document_licitacion_id_provider_id_key: {
          licitacionId,
          providerId,
        },
      },
      create: {
        licitacionId,
        providerId,
        fileName: `${providerId}.pdf`,
        contentType: contentType || 'application/pdf',
        data,
      },
      update: {
        fileName: `${providerId}.pdf`,
        contentType: contentType || 'application/pdf',
        data,
      },
    });
    return this.key(licitacionId, providerId);
  }

  async download(
    licitacionId: string,
    providerId: string,
  ): Promise<StoredProposal | null> {
    const doc = await this.prisma.proposalDocument.findUnique({
      where: {
        proposal_document_licitacion_id_provider_id_key: {
          licitacionId,
          providerId,
        },
      },
    });
    if (!doc) return null;
    return {
      buffer: Buffer.from(doc.data),
      contentType: doc.contentType ?? 'application/pdf',
      fileName: doc.fileName ?? `${providerId}.pdf`,
    };
  }
}
