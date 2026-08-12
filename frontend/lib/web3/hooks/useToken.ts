"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// ABI mínimo de ERC20 (balanceOf, allowance, approve, decimals).
export const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'spender', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

export function useTokenBalance(
  tokenAddress: `0x${string}`,
  account: `0x${string}` | undefined,
) {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account ?? '0x'],
    query: { enabled: !!tokenAddress && !!account },
  });
}

export function useAllowance(
  tokenAddress: `0x${string}`,
  owner: `0x${string}` | undefined,
  spender: `0x${string}`,
) {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner ?? '0x', spender],
    query: { enabled: !!tokenAddress && !!owner },
  });
}

export function useApproveToken(tokenAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const approve = (spender: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) throw new Error('Token address is required');
    writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}