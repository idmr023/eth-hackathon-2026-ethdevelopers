"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export function WalletButton() {
  const { address, isConnected } = useAccount();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      </div>
    );
  }

  return <ConnectButton showBalance={false} />;
}