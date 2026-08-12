"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { PhaseBadge } from "./is-phase-badge";
import { Timeline } from "./is-timeline";
import { Podium } from "./is-podium";
import { CountdownRow } from "./is-countdown-row";
import { IconCheck, IconClock, IconDocument, IconSparkles } from "./icons";
import { formatSoles } from "@/lib/licitabien/format";
import { useLicitacion } from "@/lib/licitabien/use-licitaciones";
import {
  evaluateLicitacion,
  fetchProposalBlobUrl,
  joinLicitacionWithProposal,
} from "@/lib/licitabien/api";
import { ApiError } from "@/lib/api";
import { DEFAULT_APP_ROUTE } from "@/lib/licitabien/persona";
import type { Licitacion, LicitacionPhase, PodiumEntry } from "@/lib/licitabien/types";

const VAULT = "0x80d5408c6a0496e7318b94613d11128ba9d844ff";

function timelineIndex(phase: LicitacionPhase): number {
  if (phase === "DRAFT") return 0;
  if (phase === "OPEN") return 1;
  if (phase === "REVEALING") return 2;
  return 3;
}

function buildPodium(licitacion: Licitacion): PodiumEntry[] {
  return licitacion.providers
    .filter((p) => p.amount !== null && p.amount !== undefined)
    .sort((a, b) => {
      // En CLOSED el ranking usa el puntaje compuesto (50% precio + 50% IA);
      // sin él, cae al monto menor (compatibilidad).
      const aScore = a.finalScore ?? -1;
      const bScore = b.finalScore ?? -1;
      if (aScore !== bScore) return bScore - aScore;
      return (a.amount ?? 0) - (b.amount ?? 0);
    })
    .slice(0, 3)
    .map((p, index) => ({
      rank: (index + 1) as 1 | 2 | 3,
      name: p.name,
      amount: p.amount as number,
      savings: Number(
        ((1 - (p.amount as number) / licitacion.budget) * 100).toFixed(1),
      ),
      commitmentHash: p.commitmentHash,
      aiScore: p.aiScore,
      finalScore: p.finalScore,
      winnerReason: p.winnerReason,
    }));
}

function ProposalDownload({
  licitacionId,
  providerId,
  fileName,
}: {
  licitacionId: string;
  providerId: string;
  fileName: string;
}) {
  const [error, setError] = useState(false);

  const open = async () => {
    try {
      setError(false);
      const url = await fetchProposalBlobUrl(licitacionId, providerId);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError(true);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void open()}
        title={`Abrir ${fileName}`}
        className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand-dark transition-colors hover:bg-brand/10"
      >
        <IconDocument className="size-3" />
        PDF
      </button>
      {error && (
        <span className="text-[11px] text-danger">No disponible</span>
      )}
    </span>
  );
}

function SupplierRow({
  licitacion,
  isViewerOrganizer,
}: {
  licitacion: Licitacion;
  isViewerOrganizer: boolean;
}) {
  const revealing =
    licitacion.phase === "REVEALING" || licitacion.phase === "CLOSED";
  const canDownload = isViewerOrganizer || revealing;
  return (
    <ul className="divide-y divide-border/70">
      {licitacion.providers.map((provider) => (
        <li
          key={provider.id}
          className="flex flex-wrap items-center justify-between gap-2 py-3"
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`flex size-5 items-center justify-center rounded-full ${
                provider.committed
                  ? "bg-brand-soft text-brand-dark"
                  : "bg-mist text-muted"
              }`}
            >
              {provider.committed ? (
                <IconCheck className="size-3" />
              ) : (
                <span className="text-[10px]">—</span>
              )}
            </span>
            <span className="text-sm font-medium text-ink">{provider.name}</span>
            {revealing && provider.aiScore != null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                <IconSparkles className="size-3" />
                IA {provider.aiScore}/100
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {revealing && provider.amount !== null ? (
              <>
                {provider.proposalFileName && canDownload && (
                  <ProposalDownload
                    licitacionId={licitacion.id}
                    providerId={provider.id}
                    fileName={provider.proposalFileName}
                  />
                )}
                <span className="font-mono text-xs font-semibold tabular-nums text-ink">
                  {formatSoles(provider.amount)}
                </span>
              </>
            ) : (
              <span className="font-mono text-[11px] text-muted">
                {provider.commitmentHash}
              </span>
            )}
          </div>
        </li>
      ))}
      {licitacion.providers.length === 0 && (
        <li className="py-6 text-center text-sm text-muted">
          Aún no se ha invitado a proveedores.
        </li>
      )}
    </ul>
  );
}

export function LicitacionDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { user, status } = useAuth();
  const { licitacion, loading, refresh } = useLicitacion(id);
  const backHref = DEFAULT_APP_ROUTE;

  const [offerOpen, setOfferOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [proposal, setProposal] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Al llegar la hora límite se refresca la licitación para que el backend
  // transicione de fase y auto-revele los montos sin recargar la página.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!licitacion) return;
    const target =
      licitacion.phase === "OPEN"
        ? licitacion.commitEnd
        : licitacion.phase === "REVEALING"
          ? licitacion.revealEnd
          : null;
    if (!target) return;
    const delay = new Date(target).getTime() - Date.now();
    if (delay <= 0) {
      void refresh();
      return;
    }
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void refresh(), delay + 1000);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [licitacion, refresh]);

  const isParticipant = user
    ? licitacion?.providers.some((p) => p.userId === user.id) ?? false
    : false;
  const isOrganizer = user ? licitacion?.organizerId === user.id : false;
  const canJoin = user && licitacion?.phase === "OPEN" && !isParticipant && !isOrganizer;

  async function handleJoin() {
    if (!licitacion) return;
    if (!Number(amount) || Number(amount) <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    if (!proposal) {
      setError("Debes adjuntar tu propuesta en PDF para ofertar");
      return;
    }
    if (status !== "authenticated") {
      router.push(`/login?from=/licitabien/licitaciones/${id}`);
      return;
    }
    setError(null);
    setSending(true);
    try {
      await joinLicitacionWithProposal(
        {
          licitacionId: licitacion.id,
          bidderName: user?.fullName ?? "Proveedor",
          amount: Number(amount),
        },
        proposal,
      );
      await refresh();
      setSent(true);
      setOfferOpen(false);
      setProposal(null);
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (["AUTH_REQUIRED", "SESSION_EXPIRED", "SESSION_REVOKED"].includes(cause.code)) {
          router.push(`/login?from=/licitabien/licitaciones/${id}`);
          return;
        }
        setError(cause.message);
      } else {
        setError("No se pudo sellar la oferta.");
      }
    } finally {
      setSending(false);
    }
  }

  async function handleEvaluate() {
    if (!licitacion) return;
    setEvalError(null);
    setEvaluating(true);
    try {
      await evaluateLicitacion(licitacion.id);
      await refresh();
    } catch (cause) {
      if (cause instanceof ApiError) {
        setEvalError(cause.message);
      } else {
        setEvalError("No se pudo evaluar las propuestas.");
      }
    } finally {
      setEvaluating(false);
    }
  }

  function openJoinForm() {
    setAmount("");
    setProposal(null);
    setError(null);
    setOfferOpen(true);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center">
        <p className="text-sm text-muted">Cargando licitación…</p>
      </div>
    );
  }

  if (!licitacion) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center">
        <p className="font-display text-lg font-bold text-ink">
          Licitación no encontrada
        </p>
        <p className="mt-1 text-sm text-muted">El identificador {id} no existe en la demo.</p>
        <Link
          href={backHref}
          className="mt-6 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Volver al panel
        </Link>
      </div>
    );
  }

  const isClosed = licitacion.phase === "CLOSED";
  const revealActive = licitacion.phase === "REVEALING" || isClosed;

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-brand-dark"
      >
        ← Volver a mis licitaciones
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <PhaseBadge phase={licitacion.phase} />
            <span className="font-mono text-xs text-muted">{licitacion.id}</span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">
            {licitacion.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {licitacion.category} · Presupuesto de referencia{" "}
            <span className="font-mono font-semibold text-ink">
              {formatSoles(licitacion.budget)}
            </span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <Timeline current={timelineIndex(licitacion.phase)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {licitacion.phase !== "DRAFT" && (
            <section className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-base font-bold text-ink">
                {isClosed ? "Ofertas reveladas" : "Compromisos sellados"}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {isClosed
                  ? "Todos los montos quedaron a la vista al cierre."
                  : "Los montos permanecen ocultos hasta el cierre del plazo."}
              </p>
              <div className="mt-3">
                <SupplierRow
                  licitacion={licitacion}
                  isViewerOrganizer={isOrganizer}
                />
              </div>
            </section>
          )}

          {licitacion.description && (
            <section className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-base font-bold text-ink">
                Alcance
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-navy/70">
                {licitacion.description}
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:col-span-2">
          {licitacion.phase === "OPEN" && (
            <CountdownRow target={licitacion.commitEnd} label="Cierre de compromisos" />
          )}
          {revealActive && (
            <CountdownRow target={licitacion.revealEnd} label="Fin de revelación" />
          )}

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-display text-base font-bold text-ink">
              Información del proceso
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted">
                  <IconClock className="size-4" /> Proveedores
                </dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {licitacion.providers.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted">
                  <IconDocument className="size-4" /> Bases
                </dt>
                <dd className="font-medium text-brand-dark">
                  Terminos-y-condiciones.pdf
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Mecanismo</dt>
                <dd className="font-mono text-xs font-semibold text-ink">
                  Commit–Reveal
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Red</dt>
                <dd className="font-mono text-xs font-semibold text-ink">
                  Arbitrum
                </dd>
              </div>
            </dl>
            <Link
              href="/auctions"
              className="mt-4 block w-full rounded-lg border border-brand/30 bg-brand-soft px-4 py-2.5 text-center text-sm font-semibold text-brand-dark transition-colors hover:bg-brand/10"
            >
              Ver subastas on-chain →
            </Link>
          </section>

          {isClosed && (
            <Podium
              entries={buildPodium(licitacion)}
              budget={licitacion.budget}
              contractAddress={VAULT}
            />
          )}

          {canJoin && !sent && (
            <section className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-base font-bold text-ink">
                Participar en esta licitación
              </h2>
              <p className="mt-1 text-xs text-muted">
                Tu oferta quedará sellada con hash criptográfico.
              </p>
              {offerOpen ? (
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">
                      Monto propuesto (S/)
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setError(null); }}
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
                    <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={sending}
                    className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? "Sellando…" : "Sellar y enviar oferta"}
                  </button>
                  <p className="text-center text-[11px] text-muted">
                    Se firma un hash: sin montos visibles.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openJoinForm}
                  className="mt-3 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
                >
                  Participar
                </button>
              )}
            </section>
          )}

          {isOrganizer && licitacion.phase === "REVEALING" && (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="font-display text-base font-bold text-ink">
                Evaluación IA
              </h2>
              <p className="mt-1 text-xs text-muted">
                Dispara la evaluación de propuestas PDF (OpenRouter o heurística).
              </p>
              {evalError && (
                <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {evalError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleEvaluate()}
                disabled={evaluating}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconSparkles className="size-4" />
                {evaluating ? "Evaluando…" : "Re-evaluar propuestas (IA)"}
              </button>
            </section>
          )}

          {sent && (
            <section className="rounded-xl border border-brand/40 bg-brand-soft p-5 text-center">
              <p className="text-sm font-semibold text-ink">
                ✓ Oferta sellada correctamente
              </p>
              <p className="mt-1 text-xs text-muted">
                Tu monto está oculto hasta el cierre de la fase de compromisos.
              </p>
            </section>
          )}

          {isParticipant && !sent && (
            <section className="rounded-xl border border-border bg-surface p-5 text-center">
              <p className="text-sm font-semibold text-ink">
                Ya participas en esta licitación
              </p>
              <p className="mt-1 text-xs text-muted">
                Tu compromiso está sellado con hash criptográfico.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
