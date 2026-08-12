"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/is-auth-provider";
import { Spinner } from "@/components/ui/button";
import { DEFAULT_APP_ROUTE } from "@/lib/licitabien/persona";

export default function LicitabienDashboardPage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?from=/licitabien/licitante");
      return;
    }
    if (status === "authenticated") {
      router.replace(DEFAULT_APP_ROUTE);
    }
  }, [status, router]);

  return (
    <main className="flex flex-1 items-center justify-center gap-2 text-muted">
      <Spinner /> Redirigiendo a tu panel…
    </main>
  );
}
