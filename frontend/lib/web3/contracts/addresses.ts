import { arbitrumSepolia, arbitrum } from 'wagmi/chains';

export const contractAddresses = {
  [arbitrumSepolia.id]: {
    BlindBidVault: process.env.NEXT_PUBLIC_BLIND_BID_VAULT_ADDRESS_SEPOLIA ?? '0x9b51d592f9025c88843592c6acbf21f9a96d022d',
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