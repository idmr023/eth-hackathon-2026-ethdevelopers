import { describe, expect, it } from 'vitest';
import { parseUnits } from 'viem';
import { generateCommitHash } from './commitment';

// Vectores calculados con Foundry (`cast keccak` sobre abi.encodePacked)
// para garantizar paridad exacta con BlindBidVault.sol.
describe('generateCommitHash', () => {
  it('calcula keccak256(abi.encodePacked(price, secret)) para 100 USDC', () => {
    expect(generateCommitHash(parseUnits('100', 6), 'secret')).toBe(
      '0xe2c0369f03085aa9e2997a7e45d4809c432c8a2ba5eb4100bf2e9a7c4b2b917b',
    );
  });

  it('calcula el hash con secreto vacío', () => {
    expect(generateCommitHash(parseUnits('1', 6), '')).toBe(
      '0xc1af4b94166cd32fc49b7b926cbb91ee421de2d04450e8ae57857b9b56ac7e53',
    );
  });

  it('distingue precios distintos con el mismo secreto', () => {
    expect(generateCommitHash(100n, 'secret')).toBe(
      '0xb2b20db7314751121ef22219c3ef6664d19a5d8b3acd93e21faf8dc6b4fca684',
    );
    expect(generateCommitHash(100n, 'secret')).not.toBe(
      generateCommitHash(101n, 'secret'),
    );
  });
});
