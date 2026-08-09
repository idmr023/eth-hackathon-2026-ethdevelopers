"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/is-auth-provider";
import { Spinner } from "@/components/ui/button";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      const from = encodeURIComponent(pathname ?? "/licitabien/licitante");
      router.replace(`/login?from=${from}`);
    }
  }, [status, pathname, router]);

  if (status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center gap-2 text-muted">
        <Spinner /> Verificando sesión…
      </main>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
