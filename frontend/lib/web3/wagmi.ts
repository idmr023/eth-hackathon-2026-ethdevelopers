import { createConfig, http } from 'wagmi';
import { arbitrumSepolia, arbitrum } from 'wagmi/chains';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? '3a8170812b534d0ff9d794f19a901d64';

const chains = [arbitrumSepolia, arbitrum] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ projectId }),
  ],
  transports: {
    [arbitrumSepolia.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ?? `https://arb-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? 'IZYEU2cWBgnFmgiTAgpWD'}`,
    ),
    [arbitrum.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ?? `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? 'IZYEU2cWBgnFmgiTAgpWD'}`,
    ),
  },
  ssr: true,
});

export { chains };