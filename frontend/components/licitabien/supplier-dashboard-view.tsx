"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { PhaseBadge } from "./is-phase-badge";
import { KpiCard } from "./is-kpi-card";
import { TrustBadge } from "./is-trust-badge";
import { LockNote } from "./is-lock-note";
import { IconBadgeCheck, IconCheck, IconCoins, IconExternal } from "./icons";
import { formatSoles } from "@/lib/licitabien/format";
import { useLicitaciones } from "@/lib/licitabien/use-licitaciones";
import { joinLicitacionWithProposal } from "@/lib/licitabien/api";
import { ApiError } from "@/lib/api";
import type { Licitacion } from "@/lib/licitabien/types";

export function SupplierDashboardView() {
  const router = useRouter();
  const { status, user } = useAuth();
  const { licitaciones, refresh } = useLicitaciones();
  const inProgress = licitaciones.filter((l) =>
    ["OPEN", "REVEALING"].includes(l.phase),
  );
  const myBids = user
    ? inProgress.filter((l) =>
        l.providers.some((p) => p.userId === user.id),
      )
    : inProgress;

  const available = user
    ? inProgress.filter(
        (l) =>
          !l.providers.some((p) => p.userId === user.id) &&
          l.organizerId !== user.id,
      )
    : [];

  const allParticipated = user
    ? licitaciones.filter((l) =>
        l.providers.some((p) => p.userId === user.id),
      )
    : [];
  const wonBids = allParticipated.filter((l) => l.winnerId && l.providers.some((p) => p.userId === user?.id && p.id === l.winnerId));
  const closedTotal = allParticipated.filter((l) => l.phase === "CLOSED").length;
  const winRate = closedTotal > 0 ? Math.round((wonBids.length / closedTotal) * 100) : 0;
  const nivel = winRate >= 80 ? "Oro" : winRate >= 50 ? "Plata" : winRate > 0 ? "Bronce" : "Nuevo";

  const [offerOpen, setOfferOpen] = useState(false);
  const [target, setTarget] = useState<Licitacion | null>(null);
  const [amount, setAmount] = useState("");
  const [proposal, setProposal] = useState<File | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openOffer = (licitacion: Licitacion) => {
    setTarget(licitacion);
    setAmount("");
    setProposal(null);
    setError(null);
    setOfferOpen(true);
  };

  const submitOffer = async () => {
    if (!target) return;
    if (!Number(amount) || Number(amount) <= 0) {
      setError("Ingresa un monto válido para la oferta.");
      return;
    }
    if (!proposal) {
      setError("Debes adjuntar tu propuesta en PDF para ofertar");
      return;
    }
    if (status !== "authenticated") {
      router.push("/login?from=/licitabien/licitador");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await joinLicitacionWithProposal(
        {
          licitacionId: target.id,
          bidderName: user?.fullName ?? "Proveedor",
          amount: Number(amount),
        },
        proposal,
      );
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
            Hola, {user?.fullName ?? user?.email ?? "Proveedor"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {user ? "Empresa registrada en LICITABIEN" : "Inicia sesión para participar"}
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
          value={`${winRate}%`}
          sub={`${wonBids.length} de ${closedTotal} licitaciones`}
          accent="text-brand-dark"
          icon={<IconCheck className="size-4" />}
        />
        <KpiCard
          label="Ofertas en curso"
          value={myBids.length}
          sub="compromisos sellados"
          icon={<IconCoins className="size-4" />}
        />
        <KpiCard
          label="Licitaciones ganadas"
          value={wonBids.length}
          sub="este año"
          icon={<IconCheck className="size-4" />}
        />
        <KpiCard
          label="Nivel"
          value={nivel}
          sub="reputación verificable"
          accent={nivel === "Oro" ? "text-amber-600" : nivel === "Plata" ? "text-gray-500" : "text-orange-700"}
          icon={<IconBadgeCheck className="size-4" />}
        />
      </section>

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
{myBids.map((licitacion) => {
                const selfDeal = !!user && licitacion.organizerId === user.id;
                return (
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
                    {selfDeal && (
                      <p className="mt-0.5 text-[11px] text-amber-600">
                        No puedes ofertar en tu propia licitación.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-[11px] font-semibold text-brand-dark">
                      <span className="size-1.5 rounded-full bg-brand" />
                      Comprometido
                    </span>
                    <Link
                      href={`/licitabien/licitaciones/${licitacion.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand/50 hover:text-brand-dark"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </div>
                );
              })}
          </div>
        </div>

        {available.length > 0 && (
          <div className="space-y-6 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">
                Licitaciones disponibles
              </h2>
              <span className="text-xs text-muted">
                Abiertas para nuevas ofertas
              </span>
            </div>
            <div className="divide-y divide-border/70 rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
              {available.map((licitacion) => {
                const selfDeal = !!user && licitacion.organizerId === user.id;
                return (
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
                      <p className="mt-0.5 text-[11px] text-muted">
                        Presupuesto: {formatSoles(licitacion.budget)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openOffer(licitacion)}
                      disabled={selfDeal}
                      title={selfDeal ? "No puedes ofertar en tu propia licitación" : "Enviar oferta"}
                      className="rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Participar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted">
                        Propuesta técnica (PDF, obligatorio)
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          setProposal(e.target.files?.[0] ?? null);
                          setError(null);
                        }}
                        className="mt-1.5 block w-full text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-dark hover:file:bg-brand/10"
                      />
                      {proposal && (
                        <p className="mt-1 truncate text-[11px] text-brand-dark">
                          {proposal.name}
                        </p>
                      )}
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
