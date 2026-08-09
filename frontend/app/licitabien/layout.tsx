import type { Metadata } from "next";
import { LicitabienNav, Logo } from "@/components/licitabien/licitabien-nav";

export const metadata: Metadata = {
  title: {
    default: "LICITABIEN",
    template: "%s · LICITABIEN",
  },
  description:
    "Licitaciones de sobre cerrado (commit-reveal) sobre Arbitrum para pymes. Competencia justa y verificable.",
};

export default function LicitabienLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="licitabien flex min-h-full flex-col">
      <LicitabienNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
      <footer className="mt-8 border-t border-border bg-white py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-xs text-muted">
          <Logo />
          <p>
            Demo LICITABIEN · Sobre cerrado Commit–Reveal sobre Arbitrum
          </p>
        </div>
      </footer>
    </div>
  );
}
