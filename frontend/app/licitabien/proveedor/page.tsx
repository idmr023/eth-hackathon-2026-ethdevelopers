"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/is-auth-provider";
import { Spinner } from "@/components/ui/button";

export default function LicitabienProveedorRedirect() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    router.replace(
      status === "unauthenticated"
        ? "/login?from=/licitabien/licitador"
        : "/licitabien/licitador",
    );
  }, [status, router]);

  return (
    <main className="flex flex-1 items-center justify-center gap-2 text-muted">
      <Spinner /> Redirigiendo a tu panel de licitador…
    </main>
  );
}
