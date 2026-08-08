"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { Spinner } from "@/components/ui/button";

export default function RootPage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/auctions");
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return (
    <main className="flex flex-1 items-center justify-center gap-2 text-muted">
      <Spinner /> Redirigiendo…
    </main>
  );
}
