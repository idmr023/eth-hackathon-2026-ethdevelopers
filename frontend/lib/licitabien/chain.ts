"use client";

import { useChainId } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { useQuery } from "@tanstack/react-query";
import {
  useAuction,
  useAuctionsCount,
  useTokenAddress,
} from "@/lib/web3/hooks/useBlindBidVault";
import { getContractAddress } from "@/lib/web3/contracts/addresses";
import { auctionsApi } from "@/lib/endpoints";
import type { Auction } from "@/lib/types";

export function arbiscanBase(chainId: number): string {
  return chainId === arbitrum.id ? "https://arbiscan.io" : "https://sepolia.arbiscan.io";
}

export function arbiscanAddressUrl(address: string, chainId: number): string {
  return `${arbiscanBase(chainId)}/address/${address}`;
}

export function arbiscanTxUrl(txHash: string, chainId: number): string {
  return `${arbiscanBase(chainId)}/tx/${txHash}`;
}

export function arbiscanTokenUrl(address: string, chainId: number, tokenId?: string): string {
  const base = `${arbiscanBase(chainId)}/token/${address}`;
  return tokenId ? `${base}?a=${tokenId}` : base;
}

export interface VaultLiveStats {
  totalAuctions: number | null;
  activeAuctions: number;
  address: string;
  chainName: string;
  token: string | null;
}

export function useVaultLiveStats(): {
  stats: VaultLiveStats | null;
  loading: boolean;
  error: string | null;
} {
  const chainId = useChainId();
  const countQuery = useAuctionsCount();
  const tokenQuery = useTokenAddress();
  const first = useAuction(1n);
  const second = useAuction(2n);
  const third = useAuction(3n);

  const reads = [countQuery, tokenQuery, first, second, third];
  const loading = reads.some((r) => r.isPending);
  const failed = reads.find((r) => r.isError);
  const isSepolia = chainId !== arbitrum.id;
  const vaultAddress = getContractAddress(chainId, "BlindBidVault") || "0xe582DAa8293b664c74BfC29ADd2c47eB96471b2b";

  if (loading) return { stats: null, loading: true, error: null };
  if (failed) {
    return {
      stats: {
        totalAuctions: null,
        activeAuctions: 0,
        address: vaultAddress,
        chainName: isSepolia ? "Arbitrum Sepolia" : "Arbitrum One",
        token: null,
      },
      loading: false,
      error: failed.error?.message ?? "Sin lectura on-chain",
    };
  }

  const count = countQuery.data !== undefined ? Number(countQuery.data) : null;
  const states = [first.data, second.data, third.data]
    .filter((auction): auction is NonNullable<typeof auction> => Boolean(auction))
    .map((auction) => Number(auction[7]));
  const activeAuctions = states.filter((state) => state === 0).length;

  return {
    stats: {
      totalAuctions: count === null ? null : Math.max(0, count - 1),
      activeAuctions,
      address: vaultAddress,
      chainName: isSepolia ? "Arbitrum Sepolia" : "Arbitrum One",
      token: tokenQuery.data ?? null,
    },
    loading: false,
    error: null,
  };
}

/**
 * Primera subasta ACTIVA del espejo on-chain (víctima del backend). Devuelve
 * null si el backend no responde o no hay ninguna activa. Usado por el hero de
 * la landing para mostrar datos reales en vez del mock.
 */
export function useLiveAuction(): Auction | null {
  const { data } = useQuery({
    queryKey: ["heroAuction"],
    queryFn: async () => {
      const result = await auctionsApi.list({ limit: 20 });
      return result.data;
    },
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const active = (data ?? []).find((a) => a.status === "ACTIVE") ?? null;
  return active;
}
