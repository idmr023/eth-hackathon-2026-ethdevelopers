"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/is-auth-provider";
import { Button, Spinner } from "@/components/ui/button";
import { RoleBadge } from "@/components/ui/badge";
import { can, Permissions, type Permission } from "@/lib/permissions";
import { ForceChangePassword } from "@/components/modules/auth/force-change-password";
import { ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import { Logo } from "@/components/licitabien/licitabien-nav";
import { DEFAULT_APP_ROUTE } from "@/lib/licitabien/persona";

interface NavItem {
  href: string;
  label: string;
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/auctions",
    label: "Subastas BlindBid",
    permission: Permissions.AUCTIONS_VIEW,
  },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin/users", label: "Usuarios", permission: Permissions.USERS_MANAGE },
];

// Navegación demo estática: ambos paneles + perfil para cualquier usuario con
// sesión (switch libre, sin derivación de rol).
const DEMO_ITEMS: NavItem[] = [
  { href: DEFAULT_APP_ROUTE, label: "Panel licitante" },
  { href: "/licitabien/licitador", label: "Panel licitador" },
  { href: "/licitabien/perfil", label: "Perfil y reputación" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, status, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center gap-2 text-muted">
        <Spinner /> Verificando sesión…
      </main>
    );
  }

  if (!user) {
    // Sin sesión: el gate del layout raíz redirige; aquí solo evitamos render.
    return null;
  }

  if (user.mustChangePassword) {
    return <ForceChangePassword />;
  }

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || can(user, item.permission),
  );
  const adminItems = ADMIN_ITEMS.filter(
    (item) => !item.permission || can(user, item.permission),
  );

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error(
        error instanceof ApiError ? error.message : "No se pudo cerrar sesión",
      );
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="flex min-h-full bg-mist">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-white">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
            Demo LICITABIEN
          </p>
          {DEMO_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-soft text-brand-dark border-l-2 border-brand"
                    : "text-navy/70 hover:bg-mist hover:text-ink border-l-2 border-transparent"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
            Protocolo
          </p>
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-soft text-brand-dark border-l-2 border-brand"
                    : "text-navy/70 hover:bg-mist hover:text-ink border-l-2 border-transparent"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {adminItems.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                Admin
              </p>
              {adminItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-brand-soft text-brand-dark border-l-2 border-brand"
                        : "text-navy/70 hover:bg-mist hover:text-ink border-l-2 border-transparent"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted">Protocolo criptográfico</p>
          <p className="font-mono text-[10px] text-muted/60">
            Arbitrum · Keccak256
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/85 px-6 py-3 backdrop-blur">
          <p className="font-mono text-xs text-muted">
            /{pathname.replace(/^\//, "")}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft font-mono text-xs font-semibold text-brand-dark">
                {initials(user.email)}
              </span>
              <div className="hidden text-right sm:block">
                <p className="text-sm leading-tight text-ink">{user.email}</p>
                <div className="mt-0.5">
                  <RoleBadge role={user.role} />
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              loading={loggingOut}
              onClick={handleLogout}
            >
              Salir
            </Button>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
