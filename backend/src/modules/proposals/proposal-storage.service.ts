import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export interface StoredProposal {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

// Abstracción de almacenamiento de propuestas PDF (S3/MinIO compatibles).
// Se desactiva si faltan las variables AWS_*; los métodos devuelven null o
// lanzan según el caso para que el dominio decida el comportamiento.
@Injectable()
export class ProposalStorageService {
  private readonly logger = new Logger(ProposalStorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('AWS_ENDPOINT_URL_S3');
    const region = config.get<string>('AWS_REGION', 'us-east-2');
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    const bucket = config.get<string>('AWS_BUCKET');

    if (endpoint && accessKeyId && secretAccessKey && bucket) {
      this.client = new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
        requestChecksumCalculation: 'WHEN_REQUIRED',
      });
      this.bucket = bucket;
      this.logger.log('Almacenamiento de propuestas conectado (S3/MinIO)');
    } else {
      this.client = null;
      this.bucket = '';
      this.logger.warn(
        'Almacenamiento de propuestas desactivado: faltan variables AWS_*',
      );
    }
  }

  get enabled(): boolean {
    return this.client !== null;
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
    if (!this.client) {
      throw new Error('Almacenamiento de propuestas no configurado');
    }
    const key = this.key(licitacionId, providerId);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/pdf',
      }),
    );
    return key;
  }

  async download(
    licitacionId: string,
    providerId: string,
  ): Promise<StoredProposal | null> {
    if (!this.client) return null;
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.key(licitacionId, providerId),
      }),
    );
    const stream = res.Body as
      { transformToByteArray: () => Promise<Uint8Array> } | undefined;
    if (!stream) return null;
    return {
      buffer: Buffer.from(await stream.transformToByteArray()),
      contentType: res.ContentType ?? 'application/pdf',
      fileName: `${providerId}.pdf`,
    };
  }
}
