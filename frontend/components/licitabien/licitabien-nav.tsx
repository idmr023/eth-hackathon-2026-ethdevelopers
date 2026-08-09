"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { useVaultLiveStats } from "@/lib/licitabien/chain";
import { getPersona, getPersonaRoute, type Persona } from "@/lib/licitabien/persona";
import { logout } from "@/lib/auth";
import { IconChain } from "./icons";

const PERSONA_LINKS: Record<Persona, { href: string; label: string }[]> = {
  licitante: [{ href: "/licitabien/licitante", label: "Panel licitante" }],
  licitador: [
    { href: "/licitabien/licitador", label: "Panel licitador" },
    { href: "/licitabien/perfil", label: "Perfil y reputación" },
  ],
};

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink"
    >
      <span className="flex size-6 items-center justify-center rounded-md bg-brand">
        <IconChain className="size-3.5 text-white" />
      </span>
      LICITA<span className="text-brand-dark">BIEN</span>
    </Link>
  );
}

export function LicitabienNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { stats } = useVaultLiveStats();
  const { user } = useAuth();

  const persona = user ? getPersona(user) : null;
  const links = persona ? PERSONA_LINKS[persona] : [];

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Logo href={persona ? getPersonaRoute(user) : "/"} />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-soft text-brand-dark"
                    : "text-navy/70 hover:bg-mist hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <span
            className="hidden items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1.5 text-[11px] font-medium text-brand-dark lg:inline-flex"
            title="Lectura en vivo del contrato BlindBidVault en Arbitrum Sepolia"
          >
            <IconChain className="size-3" />
            {stats
              ? `${stats.totalAuctions ?? "—"} subastas on-chain · ${stats.chainName}`
              : "Conectando a Arbitrum…"}
          </span>
          {user ? (
            <span className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-soft px-3.5 py-2 text-sm font-medium text-brand-dark"
                title={`Sesión: ${user.email}`}
              >
                {user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand/50"
              >
                Cerrar sesión
              </button>
            </span>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand/50"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
