import { Injectable } from '@nestjs/common';
import {
  computeInvoiceHash,
  keccak256Hex,
  InvoiceHashInput,
} from './invoice-hash';

export type { InvoiceHashInput };

// Criptografía de hashing del protocolo. El hash se calcula server-side.
@Injectable()
export class CryptoService {
  computeInvoiceHash = computeInvoiceHash;
  keccak256Hex = keccak256Hex;

  shortHash(hash: string, head = 6, tail = 4): string {
    if (hash.length <= head + tail + 3) return hash;
    return `${hash.slice(0, head + 2)}…${hash.slice(-tail)}`;
  }
}
