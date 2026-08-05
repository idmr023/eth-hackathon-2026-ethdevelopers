import { keccak256 } from 'js-sha3';

export interface InvoiceHashInput {
  rucEmisor: string;
  rucReceptor: string;
  numero: string;
  monto: string;
}

// Fórmula del protocolo: Keccak256(RUC_Emisor | RUC_Receptor | Numero | Monto).
// Función pura compartida entre el backend (CryptoService) y el seed.
export function computeInvoiceHash(input: InvoiceHashInput): string {
  const canonical = [
    input.rucEmisor.trim(),
    input.rucReceptor.trim(),
    input.numero.trim(),
    input.monto.toString().trim(),
  ].join('|');
  return keccak256Hex(canonical);
}

export function keccak256Hex(data: string): string {
  return '0x' + keccak256(data);
}
