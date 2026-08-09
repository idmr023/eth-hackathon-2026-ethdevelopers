"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { PhaseBadge } from "./is-phase-badge";
import { KpiCard } from "./is-kpi-card";
import { TrustBadge } from "./is-trust-badge";
import { RwaCard } from "./is-rwa-card";
import { ChainBadge } from "./is-chain-badge";
import { LockNote } from "./is-lock-note";
import { IconBadgeCheck, IconCheck, IconCoins, IconExternal } from "./icons";
import { rwaAsset, proveedorDemo } from "@/lib/licitabien/mock-data";
import { formatSoles } from "@/lib/licitabien/format";
import { useLicitaciones } from "@/lib/licitabien/use-licitaciones";
import { joinLicitacion } from "@/lib/licitabien/api";
import { ApiError } from "@/lib/api";
import { arbiscanAddressUrl } from "@/lib/licitabien/chain";
import { useChainId } from "wagmi";
import type { Licitacion } from "@/lib/licitabien/types";

export function SupplierDashboardView() {
  const router = useRouter();
  const { status, user } = useAuth();
  const chainId = useChainId();
  const { licitaciones, refresh } = useLicitaciones();
  const winner = licitaciones.find((l) => l.id === "LIC-2024-004");
  const inProgress = licitaciones.filter((l) =>
    ["OPEN", "REVEALING"].includes(l.phase),
  );
  const myBids = user
    ? inProgress.filter((l) =>
        l.providers.some((p) => p.userId === user.id),
      )
    : inProgress;

  const [offerOpen, setOfferOpen] = useState(false);
  const [target, setTarget] = useState<Licitacion | null>(null);
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("30");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openOffer = (licitacion: Licitacion) => {
    setTarget(licitacion);
    setAmount("");
    setError(null);
    setOfferOpen(true);
  };

  const submitOffer = async () => {
    if (!target) return;
    if (!Number(amount) || Number(amount) <= 0) {
      setError("Ingresa un monto válido para la oferta.");
      return;
    }
    if (status !== "authenticated") {
      router.push("/login?from=/licitabien/licitador");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await joinLicitacion({
        licitacionId: target.id,
        bidderName: proveedorDemo.name,
        amount: Number(amount),
      });
      await refresh();
      setSent(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (
          cause.code === "AUTH_REQUIRED" ||
          cause.code === "SESSION_EXPIRED" ||
          cause.code === "SESSION_REVOKED"
        ) {
          router.push("/login?from=/licitabien/licitador");
          return;
        }
        setError(cause.message);
      } else {
        setError("No se pudo sellar la oferta. Inténtalo de nuevo.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark">
            Panel licitador
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
            Hola, {user?.email ?? proveedorDemo.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {user ? "Empresa registrada en LICITABIEN" : `${proveedorDemo.name} S.A.C. · RUC ${proveedorDemo.ruc}`}
          </p>
        </div>
        <Link
          href="/licitabien/perfil"
          className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand/10"
        >
          <IconBadgeCheck className="size-4" />
          Ver reputación verificable
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tasa de adjudicación"
          value={`${proveedorDemo.winRate}%`}
          sub="licitaciones ganadas"
          accent="text-brand-dark"
          icon={<IconCheck className="size-4" />}
        />
        <KpiCard
          label="Ofertas en curso"
          value={proveedorDemo.activeBids}
          sub="compromisos sellados"
          icon={<IconCoins className="size-4" />}
        />
        <KpiCard
          label="Licitaciones ganadas"
          value={proveedorDemo.wonBids}
          sub="este año"
          icon={<IconCheck className="size-4" />}
        />
        <KpiCard
          label="Nivel"
          value="Oro"
          sub="reputación soberana"
          accent="text-amber-600"
          icon={<IconBadgeCheck className="size-4" />}
        />
      </section>

      {winner && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <IconBadgeCheck className="size-5 text-amber-500" />
              <h2 className="font-display text-lg font-bold text-ink">
                Licitación ganada
              </h2>
              <PhaseBadge phase={winner.phase} />
            </div>
            <h3 className="mt-3 font-display text-xl font-bold text-ink">
              {winner.title}
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Monto adjudicado
                </p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-ink">
                  {formatSoles(winner.winningAmount ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-white/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Ahorro generado
                </p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-brand-dark">
                  15%
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3">
              <p className="text-xs text-muted">
                Orden de compra adjudicada · LIC-2024-004
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

          <RwaCard asset={rwaAsset} />
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">
              Ofertas en curso
            </h2>
            <span className="text-xs text-muted">
              Tus compromisos están sellados y ocultos
            </span>
          </div>
          <div className="divide-y divide-border/70 rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
            {myBids.map((licitacion) => (
              <div
                key={licitacion.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <PhaseBadge phase={licitacion.phase} />
                    <span className="font-mono text-[11px] text-muted">
                      {licitacion.id}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-medium text-ink">
                    {licitacion.title}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-muted">
                    Comprometido ✓
                  </span>
                  <button
                    type="button"
                    onClick={() => openOffer(licitacion)}
                    className="rounded-lg bg-navy px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink"
                  >
                    Enviar oferta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {offerOpen ? (
            <div className="space-y-4">
              {sent ? (                <div className="rounded-xl border border-brand/40 bg-brand-soft p-6 text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand text-white">
                    <IconCheck className="size-6" />
                  </span>
                  <h3 className="mt-3 font-display text-lg font-bold text-ink">
                    Compromiso sellado
                  </h3>
                  <p className="mt-1 text-sm text-navy/70">
                    Tu oferta quedó cifrada en la red.{" "}
                    <strong className="font-semibold text-ink">
                      Nadie puede verla hasta el cierre.
                    </strong>
                  </p>
                  <LockNote>
                    Guarda tu comprobante: sin él no podrás revelar tu oferta al
                    final del plazo.
                  </LockNote>
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setOfferOpen(false);
                      setTarget(null);
                      setAmount("");
                    }}
                    className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    Listo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <TrustBadge />
                  <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
                    <h3 className="font-display text-base font-bold text-ink">
                      Nueva oferta
                    </h3>
                    {target && (
                      <p className="mt-1 truncate text-xs text-muted">
                        {target.id} · {target.title}
                      </p>
                    )}
                    <label className="mt-4 block">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted">
                        Monto propuesto (S/)
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setError(null);
                        }}
                        placeholder="0"
                        className="mt-1.5 h-10 w-full rounded-md border border-border bg-white px-3 font-mono text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-brand"
                      />
                    </label>
                    <label className="mt-3 block">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted">
                        Plazo de entrega (días)
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        className="mt-1.5 h-10 w-full rounded-md border border-border bg-white px-3 font-mono text-sm text-ink outline-none transition-colors focus:border-brand"
                      />
                    </label>
                    {error && (
                      <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                        {error}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={submitOffer}
                      disabled={sending}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <IconExternal className="size-4" />
                      {sending ? "Sellando…" : "Sellar y enviar oferta"}
                    </button>
                    <p className="mt-2 text-center text-[11px] text-muted">
                      Se firma un hash de compromiso: sin montos visibles.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-mist/50 p-8 text-center">
              <IconCoins className="mx-auto size-8 text-brand-dark" />
              <p className="mt-3 text-sm font-medium text-ink">
                ¿Participar en una nueva licitación?
              </p>
              <p className="mt-1 text-xs text-muted">
                Selecciona &quot;Enviar oferta&quot; en una de tus licitaciones
                activas.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
