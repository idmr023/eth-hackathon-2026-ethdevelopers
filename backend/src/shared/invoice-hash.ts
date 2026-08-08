import { keccak256, encodePacked } from 'viem';

export interface InvoiceHashInput {
  rucEmisor: string;
  rucReceptor: string;
  numero: string;
  monto: string;
}

// Fórmula del protocolo: Keccak256(RUC_Emisor | RUC_Receptor | Numero | Monto).
// Función pura compartida entre el backend (CryptoService) y el seed.
// Debe coincidir exactamente con el cálculo en Solidity (BlindBidVault).
export function computeInvoiceHash(input: InvoiceHashInput): string {
  const canonical = encodePacked(
    ['string', 'string', 'string', 'string'],
    [
      input.rucEmisor.trim(),
      input.rucReceptor.trim(),
      input.numero.trim(),
      input.monto.toString().trim(),
    ],
  );
  return keccak256(canonical);
}

export function keccak256Hex(data: string): string {
  return keccak256(new TextEncoder().encode(data));
}
