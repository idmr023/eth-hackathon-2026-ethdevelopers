"use client";

import { IsAuthProvider } from "@/components/is-auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <IsAuthProvider>{children}</IsAuthProvider>;
}
