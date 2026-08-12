"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { blindBidVaultAbi } from '@/lib/web3/contracts/BlindBidVault';
import { getContractAddress } from '@/lib/web3/contracts/addresses';

// Types matching the contract
export interface Auction {
  organizer: `0x${string}`;
  treasury: `0x${string}`;
  stakeAmount: bigint;
  minPrice: bigint;
  maxPrice: bigint;
  commitEnd: bigint;
  revealEnd: bigint;
  state: number; // 0=Active, 1=Settled, 2=Cancelled
  winner: `0x${string}`;
  winningPrice: bigint;
}

export interface Commitment {
  hash: `0x${string}`;
  revealed: boolean;
  slashed: boolean;
  refunded: boolean;
  price: bigint;
}

export function useBlindBidVaultAddress() {
  const chainId = useChainId();
  return getContractAddress(chainId, 'BlindBidVault');
}

// Read hooks
export function useAuction(auctionId: bigint) {
  const address = useBlindBidVaultAddress();
  return useReadContract({
    address: address as `0x${string}`,
    abi: blindBidVaultAbi,
    functionName: 'auctions',
    args: [auctionId],
    query: { enabled: !!address && auctionId > 0n },
  });
}

export function useAuctionsCount() {
  const address = useBlindBidVaultAddress();
  return useReadContract({
    address: address as `0x${string}`,
    abi: blindBidVaultAbi,
    functionName: 'nextAuctionId',
    query: { enabled: !!address },
  });
}

export function useCommitment(auctionId: bigint, bidder: `0x${string}`) {
  const address = useBlindBidVaultAddress();
  return useReadContract({
    address: address as `0x${string}`,
    abi: blindBidVaultAbi,
    functionName: 'commitments',
    args: [auctionId, bidder],
    query: { enabled: !!address && auctionId > 0n && bidder !== '0x' },
  });
}

export function usePriceWeight() {
  const address = useBlindBidVaultAddress();
  return useReadContract({
    address: address as `0x${string}`,
    abi: blindBidVaultAbi,
    functionName: 'priceWeight',
    query: { enabled: !!address },
  });
}

export function useQualityWeight() {
  const address = useBlindBidVaultAddress();
  return useReadContract({
    address: address as `0x${string}`,
    abi: blindBidVaultAbi,
    functionName: 'qualityWeight',
    query: { enabled: !!address },
  });
}

export function useTokenAddress() {
  const address = useBlindBidVaultAddress();
  return useReadContract({
    address: address as `0x${string}`,
    abi: blindBidVaultAbi,
    functionName: 'token',
    query: { enabled: !!address },
  });
}

export function useAuditScore(auctionId: bigint, bidder: `0x${string}`) {
  const address = useBlindBidVaultAddress();
  return useReadContract({
    address: address as `0x${string}`,
    abi: blindBidVaultAbi,
    functionName: 'auditScores',
    args: [auctionId, bidder],
    query: { enabled: !!address && auctionId > 0n && bidder !== '0x' },
  });
}

// hasCommitted(auctionId, bidder) → bool
export function useHasCommitted(auctionId: bigint, bidder: `0x${string}`) {
  const address = useBlindBidVaultAddress();
  return useReadContract({
    address: address as `0x${string}`,
    abi: blindBidVaultAbi,
    functionName: 'hasCommitted',
    args: [auctionId, bidder],
    query: { enabled: !!address && auctionId > 0n && bidder !== '0x' },
  });
}

// Write hooks
export function useCreateAuction() {
  const address = useBlindBidVaultAddress();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const createAuction = (params: {
    treasury: `0x${string}`;
    stakeAmount: bigint;
    minPrice: bigint;
    maxPrice: bigint;
    commitEnd: bigint;
    revealEnd: bigint;
  }) => {
    if (!address) throw new Error('Contract not deployed on this network');
    writeContract({
      address: address as `0x${string}`,
      abi: blindBidVaultAbi,
      functionName: 'createAuction',
      args: [params.treasury, params.stakeAmount, params.minPrice, params.maxPrice, params.commitEnd, params.revealEnd],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    createAuction,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

export function useCommitBid() {
  const address = useBlindBidVaultAddress();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const commitBid = (auctionId: bigint, commitment: `0x${string}`) => {
    if (!address) throw new Error('Contract not deployed on this network');
    writeContract({
      address: address as `0x${string}`,
      abi: blindBidVaultAbi,
      functionName: 'commitBid',
      args: [auctionId, commitment],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    commitBid,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

export function useRevealBid() {
  const address = useBlindBidVaultAddress();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const revealBid = (params: {
    auctionId: bigint;
    bidder: `0x${string}`;
    price: bigint;
    secret: string;
  }) => {
    if (!address) throw new Error('Contract not deployed on this network');
    writeContract({
      address: address as `0x${string}`,
      abi: blindBidVaultAbi,
      functionName: 'revealBid',
      args: [params.auctionId, params.bidder, params.price, params.secret],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    revealBid,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

export function useSettleAuction() {
  const address = useBlindBidVaultAddress();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const settleAuction = (auctionId: bigint) => {
    if (!address) throw new Error('Contract not deployed on this network');
    writeContract({
      address: address as `0x${string}`,
      abi: blindBidVaultAbi,
      functionName: 'settleAuction',
      args: [auctionId],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    settleAuction,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

export function useClaimRefund() {
  const address = useBlindBidVaultAddress();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const claimRefund = (auctionId: bigint) => {
    if (!address) throw new Error('Contract not deployed on this network');
    writeContract({
      address: address as `0x${string}`,
      abi: blindBidVaultAbi,
      functionName: 'claimRefund',
      args: [auctionId],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    claimRefund,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

export function useSlashBid() {
  const address = useBlindBidVaultAddress();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const slashBid = (auctionId: bigint, bidder: `0x${string}`) => {
    if (!address) throw new Error('Contract not deployed on this network');
    writeContract({
      address: address as `0x${string}`,
      abi: blindBidVaultAbi,
      functionName: 'slashBid',
      args: [auctionId, bidder],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    slashBid,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

// cancelAuction(auctionId) — solo el organizer.
export function useCancelAuction() {
  const address = useBlindBidVaultAddress();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const cancelAuction = (auctionId: bigint) => {
    if (!address) throw new Error('Contract not deployed on this network');
    writeContract({
      address: address as `0x${string}`,
      abi: blindBidVaultAbi,
      functionName: 'cancelAuction',
      args: [auctionId],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    cancelAuction,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

// setAuditScore(auctionId, bidder, aiScore, docHash, summaryUri) — solo AUDITOR_ROLE.
export function useSetAuditScore() {
  const address = useBlindBidVaultAddress();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const setAuditScore = (params: {
    auctionId: bigint;
    bidder: `0x${string}`;
    aiScore: bigint;
    docHash: `0x${string}`;
    summaryUri: string;
  }) => {
    if (!address) throw new Error('Contract not deployed on this network');
    writeContract({
      address: address as `0x${string}`,
      abi: blindBidVaultAbi,
      functionName: 'setAuditScore',
      args: [
        params.auctionId,
        params.bidder,
        params.aiScore,
        params.docHash,
        params.summaryUri,
      ],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    setAuditScore,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}