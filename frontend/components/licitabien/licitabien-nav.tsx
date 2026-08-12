"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { useVaultLiveStats } from "@/lib/licitabien/chain";
import { DEFAULT_APP_ROUTE } from "@/lib/licitabien/persona";
import { IconChain } from "./icons";

// Switch libre: cualquier sesión ve ambos paneles + perfil.
const AUTH_LINKS = [
  { href: DEFAULT_APP_ROUTE, label: "Panel licitante" },
  { href: "/licitabien/licitador", label: "Panel licitador" },
  { href: "/licitabien/perfil", label: "Perfil y reputación" },
];

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
  const { user, logout } = useAuth();

  const links = user ? AUTH_LINKS : [];

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Logo href={user ? DEFAULT_APP_ROUTE : "/"} />
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
              : "Modo demo"}
          </span>
          {user ? (
            <span className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-soft px-3.5 py-2 text-sm font-medium text-brand-dark"
                title={`Sesión: ${user.email}`}
              >
                {user.email}
              </span>
              <Link
                href="/licitabien/cuenta"
                className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand/50"
              >
                Mi cuenta
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand/50"
              >
                Cerrar sesión
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand/50"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Registrarse
              </Link>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
