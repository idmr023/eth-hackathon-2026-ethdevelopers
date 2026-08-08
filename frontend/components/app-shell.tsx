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

interface NavItem {
  href: string;
  label: string;
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/auctions", label: "Licitaciones", permission: Permissions.AUCTIONS_VIEW },
  { href: "/admin/users", label: "Usuarios", permission: Permissions.USERS_MANAGE },
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
    <div className="flex min-h-full">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/60">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="size-2.5 rounded-full bg-primary shadow-[var(--shadow-glow)]" />
          <span className="font-mono text-sm font-bold tracking-widest text-foreground">
            LICITA<span className="text-primary">BIEN</span>
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted hover:bg-surface-2 hover:text-foreground border-l-2 border-transparent"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted">Protocolo criptográfico</p>
          <p className="font-mono text-[10px] text-muted/60">
            Arbitrum · Keccak256
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
          <p className="font-mono text-xs text-muted">
            /{pathname.replace(/^\//, "")}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 font-mono text-xs font-semibold text-primary">
                {initials(user.email)}
              </span>
              <div className="hidden text-right sm:block">
                <p className="text-sm leading-tight text-foreground">{user.email}</p>
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
