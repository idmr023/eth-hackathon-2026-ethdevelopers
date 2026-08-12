import type { Metadata } from "next";
import Link from "next/link";
import { RecoveryForm } from "@/components/modules/auth/recovery-form";
import { Logo } from "@/components/licitabien/licitabien-nav";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Logo />
          <Link
            href="/login"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brand/50"
          >
            Volver al inicio
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <RecoveryForm />
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