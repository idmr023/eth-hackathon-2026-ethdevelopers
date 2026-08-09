"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/is-auth-provider";
import { Spinner } from "@/components/ui/button";
import { getPersonaRoute } from "@/lib/licitabien/persona";

export default function LicitabienDashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?from=/licitabien/licitante");
      return;
    }
    if (status === "authenticated") {
      router.replace(getPersonaRoute(user));
    }
  }, [status, user, router]);

  return (
    <main className="flex flex-1 items-center justify-center gap-2 text-muted">
      <Spinner /> Redirigiendo a tu panel…
    </main>
  );
}
