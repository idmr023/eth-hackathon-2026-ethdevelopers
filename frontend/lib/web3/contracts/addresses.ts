import { arbitrumSepolia, arbitrum } from 'wagmi/chains';

export const contractAddresses = {
  [arbitrumSepolia.id]: {
    BlindBidVault: process.env.NEXT_PUBLIC_BLIND_BID_VAULT_ADDRESS_SEPOLIA ?? '0xe582DAa8293b664c74BfC29ADd2c47eB96471b2b',
    USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA ?? '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },
  [arbitrum.id]: {
    BlindBidVault: process.env.NEXT_PUBLIC_BLIND_BID_VAULT_ADDRESS_MAINNET ?? '',
    USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS_MAINNET ?? '',
  },
} as const;

export const EAS_SCHEMA_UID =
  process.env.NEXT_PUBLIC_EAS_SCHEMA_UID_SEPOLIA ??
  '0x4fa9cf44d6e3cd985ce487188d14b4e11eda2699bb49d7163ec9c2c3c769d5f5';

type ChainAddresses = (typeof contractAddresses)[keyof typeof contractAddresses];

export function getContractAddress(
  chainId: number,
  contractName: keyof ChainAddresses,
): string | undefined {
  return contractAddresses[chainId as keyof typeof contractAddresses]?.[contractName];
}