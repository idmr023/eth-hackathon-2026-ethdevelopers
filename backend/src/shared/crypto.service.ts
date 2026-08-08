import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import {
  computeInvoiceHash,
  keccak256Hex,
  InvoiceHashInput,
} from './invoice-hash';

export type { InvoiceHashInput };

// Criptografía del protocolo: Keccak256 server-side + AES-GCM para secrets del agent.
@Injectable()
export class CryptoService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = configService.get<string>('AGENT_ENCRYPTION_KEY');
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'AGENT_ENCRYPTION_KEY debe ser 32 bytes (64 chars hex) para AES-256-GCM',
      );
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  computeInvoiceHash = computeInvoiceHash;
  keccak256Hex = keccak256Hex;

  shortHash(hash: string, head = 6, tail = 4): string {
    if (hash.length <= head + tail + 3) return hash;
    return `${hash.slice(0, head + 2)}…${hash.slice(-tail)}`;
  }

  // AES-256-GCM para cifrar/descifrar secrets del agent (reveal secrets).
  // Retorna: iv(12B) + ciphertext + authTag(16B) en hex.
  encrypt(plaintext: string): string {
    const iv = randomBytes(12); // 96-bit nonce para GCM
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, ciphertext, authTag]).toString('hex');
  }

  decrypt(ciphertextHex: string): string {
    const data = Buffer.from(ciphertextHex, 'hex');
    const iv = data.subarray(0, 12);
    const authTag = data.subarray(-16);
    const ciphertext = data.subarray(12, -16);
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }
}
