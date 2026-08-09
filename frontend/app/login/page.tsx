import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/modules/auth/login-form";
import { Logo } from "@/components/licitabien/licitabien-nav";

export const metadata: Metadata = {
  title: "Acceso",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Logo />
          <Link
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brand/50"
          >
            Volver al inicio
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <LoginForm />
      </main>
      <footer className="border-t border-border bg-white py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-muted">
          <p>
            LICITABIEN · Licitaciones de sobre cerrado sobre Arbitrum ·{" "}
            <span className="font-mono">Commit-Reveal</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
