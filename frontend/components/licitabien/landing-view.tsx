"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { Button } from "@/components/ui/button";
import { CountdownRow } from "./is-countdown-row";
import { LockNote } from "./is-lock-note";
import { ChainBadge } from "./is-chain-badge";
import { Logo } from "./licitabien-nav";
import { licitaciones } from "@/lib/licitabien/mock-data";
import { arbiscanAddressUrl } from "@/lib/licitabien/chain";
import { getPersonaRoute } from "@/lib/licitabien/persona";
import { useChainId } from "wagmi";
import {
  IconChain,
  IconCheck,
  IconLock,
  IconSparkles,
} from "./icons";

const METRICS = [
  { value: "1,240+", label: "Licitaciones publicadas" },
  { value: "8,900+", label: "Proveedores activos" },
  { value: "100%", label: "Ofertas verificables" },
];

const PRIVACY_CARDS = [
  {
    icon: IconLock,
    title: "Cifrado local",
    text: "Tus datos no viajan en texto plano. Tu oferta se sella en tu navegador antes de salir de tu computadora.",
  },
  {
    icon: IconChain,
    title: "Sellado en Blockchain",
    text: "Cada compromiso queda registrado de forma inmutable en Arbitrum. Nadie puede borrarlo ni modificarlo después.",
  },
  {
    icon: IconSparkles,
    title: "Revelación justa",
    text: "Al cierre del plazo, las ofertas se abren y el ganador se determina automáticamente por el código, sin manos humanas.",
  },
];

function RegisterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <IconSparkles className="size-6" />
        </span>
        <h3 className="mt-4 font-display text-lg font-bold text-ink">
          Registro en preparación
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Pronto podrás crear tu cuenta de empresa. Este botón quedó preparado
          para conectarse a la base de datos de usuarios.
        </p>
        <Button
          className="mt-6 w-full bg-brand text-white hover:bg-brand-dark"
          onClick={onClose}
        >
          Entendido
        </Button>
      </div>
    </div>
  );
}

function HeroAuctionCard() {
  const chainId = useChainId();
  const demo = licitaciones[0];

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-navy px-3 py-1 text-[11px] font-semibold tracking-wide text-white">
          <span className="anim-pulse-dot size-1.5 rounded-full bg-brand" />
          LICITACIÓN ACTIVA · FASE SELLADA
        </span>
        <span className="text-xs text-muted">{demo.id}</span>
      </div>

      <h3 className="mt-4 font-display text-xl font-bold leading-snug text-ink">
        {demo.title}
      </h3>

      <div className="mt-4">
        <CountdownRow target={demo.commitEnd} label="Cierre de compromisos" />
      </div>

      <ul className="mt-5 space-y-2">
        {demo.providers.slice(0, 3).map((provider) => (
          <li
            key={provider.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-mist px-3 py-2.5"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              <IconCheck className="size-4 text-brand-dark" />
              {provider.name}
            </span>
            <span className="font-mono text-[11px] text-muted">
              {provider.commitmentHash}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <LockNote>
          Los montos están ocultos hasta el cierre del plazo. Solo verás que cada
          proveedor ya selló su compromiso.
        </LockNote>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <p className="text-[11px] text-muted">
          Contrato: <span className="font-medium text-ink">BlindBidVault</span>
        </p>
        <ChainBadge
          href={arbiscanAddressUrl(
            "0x80d5408c6a0496e7318b94613d11128ba9d844ff",
            chainId,
          )}
          label="0x80d5…44ff"
        />
      </div>
    </div>
  );
}

export function LandingView() {
  const [registerOpen, setRegisterOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const goToDashboard = useCallback(() => {
    router.push(
      user
        ? getPersonaRoute(user)
        : "/login?from=/licitabien/licitante",
    );
  }, [user, router]);

  return (
    <div className="licitabien min-h-full">
      <header className="border-b border-border/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Logo />
          <div className="flex items-center gap-3">
            {user ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-soft px-3.5 py-2 text-sm font-medium text-brand-dark"
                title={`Sesión: ${user.email}`}
              >
                {user.email}
              </span>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brand/50"
              >
                Iniciar sesión
              </Link>
            )}
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Registrarse
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-dark">
                <IconChain className="size-3.5" />
                Sobre cerrado · Commit-Reveal sobre Arbitrum
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink lg:text-5xl">
                Licitaciones selladas.{" "}
                <span className="text-brand-dark">
                  Nadie ve tu oferta antes del cierre.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-navy/70">
                Competencia justa y verificable para pymes. Proveedores envían
                propuestas cifradas, el ganador se determina automáticamente al
                cierre. Sin manipulación posible.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={goToDashboard}
                  className="inline-flex items-center rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-colors hover:bg-brand-dark"
                >
                  Publicar mi primera licitación gratis
                </button>
                <a
                  href="#privacidad"
                  className="inline-flex items-center rounded-xl border border-border bg-white px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand/50 hover:bg-mist"
                >
                  ¿Cómo funciona?
                </a>
              </div>
              <dl className="mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-border pt-8">
                {METRICS.map((metric) => (
                  <div key={metric.label}>
                    <dt className="order-2 mt-1 text-xs text-muted">
                      {metric.label}
                    </dt>
                    <dd className="font-display text-2xl font-bold tabular-nums text-ink">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="anim-float-slow">
              <HeroAuctionCard />
            </div>
          </div>
        </section>

        <section id="privacidad" className="bg-navy py-20 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand">
              <IconLock className="size-3.5" />
              Garantía criptográfica
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight lg:text-4xl">
              Así funciona la garantía de privacidad
            </h2>
            <p className="mt-3 max-w-2xl text-white/70">
              Tu competencia es legítima: nadie, ni siquiera nosotros, puede
              ver o alterar una oferta antes del cierre del plazo.
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {PRIVACY_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand/15">
                    <card.icon className="size-5 text-brand" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {card.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={goToDashboard}
                className="inline-flex items-center rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-colors hover:bg-brand-dark"
              >
                Listo para iniciar con garantías, dale clic aquí
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-muted">
          <Logo />
          <p>
            LICITABIEN · Licitaciones de sobre cerrado sobre Arbitrum ·{" "}
            <span className="font-mono">Commit-Reveal</span>
          </p>
        </div>
      </footer>

      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  );
}
