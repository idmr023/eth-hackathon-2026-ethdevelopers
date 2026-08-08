"use client";

import { IsAuthProvider } from "@/components/is-auth-provider";
import { Web3Provider } from "@/lib/web3/Web3Provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <IsAuthProvider>
      <Web3Provider>{children}</Web3Provider>
    </IsAuthProvider>
  );
}
