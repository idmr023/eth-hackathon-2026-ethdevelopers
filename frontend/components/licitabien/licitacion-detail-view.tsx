"use client";

import Link from "next/link";
import { useAuth } from "@/components/is-auth-provider";
import { PhaseBadge } from "./is-phase-badge";
import { Timeline } from "./is-timeline";
import { Podium } from "./is-podium";
import { CountdownRow } from "./is-countdown-row";
import { IconCheck, IconClock, IconDocument } from "./icons";
import { formatSoles } from "@/lib/licitabien/format";
import { useLicitacion } from "@/lib/licitabien/use-licitaciones";
import { getPersonaRoute } from "@/lib/licitabien/persona";
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
    .sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0))
    .slice(0, 3)
    .map((p, index) => ({
      rank: (index + 1) as 1 | 2 | 3,
      name: p.name,
      amount: p.amount as number,
      savings: Number(
        ((1 - (p.amount as number) / licitacion.budget) * 100).toFixed(1),
      ),
      commitmentHash: p.commitmentHash,
    }));
}

function SupplierRow({ licitacion }: { licitacion: Licitacion }) {
  const revealing = licitacion.phase === "REVEALING" || licitacion.phase === "CLOSED";
  return (
    <ul className="divide-y divide-border/70">
      {licitacion.providers.map((provider) => (
        <li
          key={provider.id}
          className="flex items-center justify-between gap-3 py-3"
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
          </div>
          <div className="flex items-center gap-4">
            {revealing && provider.amount !== null ? (
              <>
                <span className="text-xs text-muted">
                  Calidad IA: <span className="font-semibold text-ink">{provider.qualityScore}</span>
                </span>
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
  const { licitacion, loading } = useLicitacion(id);
  const { user } = useAuth();
  const backHref = getPersonaRoute(user);

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
                <SupplierRow licitacion={licitacion} />
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
          </section>

          {isClosed && (
            <Podium
              entries={buildPodium(licitacion)}
              budget={licitacion.budget}
              contractAddress={VAULT}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
