"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/is-auth-provider";
import { Spinner } from "@/components/ui/button";

export default function LicitabienProveedorPerfilRedirect() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    router.replace(
      status === "unauthenticated"
        ? "/login?from=/licitabien/perfil"
        : "/licitabien/perfil",
    );
  }, [status, router]);

  return (
    <main className="flex flex-1 items-center justify-center gap-2 text-muted">
      <Spinner /> Redirigiendo a tu perfil…
    </main>
  );
}
