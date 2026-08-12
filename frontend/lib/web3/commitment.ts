import { encodePacked, keccak256, type Hex } from 'viem';

/**
 * Hash ciego de una oferta: equivalente Solidity de
 * keccak256(abi.encodePacked(price, secret)) en BlindBidVault.commitBid/revealBid.
 * El precio debe ir en la unidad mínima del token (USDC: 6 decimales).
 */
export function generateCommitHash(price: bigint, secret: string): Hex {
  return keccak256(encodePacked(['uint256', 'string'], [price, secret]));
}
