import { arbitrumSepolia, arbitrum } from 'wagmi/chains';

export const contractAddresses = {
  [arbitrumSepolia.id]: {
    BlindBidVault: process.env.NEXT_PUBLIC_BLIND_BID_VAULT_ADDRESS_SEPOLIA ?? '0x80d5408c6a0496e7318b94613d11128ba9d844ff',
  },
  [arbitrum.id]: {
    BlindBidVault: process.env.NEXT_PUBLIC_BLIND_BID_VAULT_ADDRESS_MAINNET ?? '',
  },
} as const;

type ChainAddresses = (typeof contractAddresses)[keyof typeof contractAddresses];

export function getContractAddress(
  chainId: number,
  contractName: keyof ChainAddresses,
): string | undefined {
  return contractAddresses[chainId as keyof typeof contractAddresses]?.[contractName];
}