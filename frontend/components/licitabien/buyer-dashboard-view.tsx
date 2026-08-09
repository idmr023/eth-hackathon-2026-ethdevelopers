"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/is-auth-provider";
import { PhaseBadge } from "./is-phase-badge";
import { KpiCard } from "./is-kpi-card";
import {
  FilterPills,
  DashboardFilter,
  type DashboardFilter as FilterValue,
} from "./is-filter-pills";
import { LicitacionWizard } from "./licitacion-wizard";
import { IconPlus, IconTrendingDown, IconUsers, IconClock, IconCheck } from "./icons";
import { formatSoles, formatCompactCountdown } from "@/lib/licitabien/format";
import { useCountdown } from "@/lib/licitabien/use-countdown";
import { useLicitaciones } from "@/lib/licitabien/use-licitaciones";
import type { LicitacionPhase } from "@/lib/licitabien/types";

function CountdownCell({ target }: { target: string }) {
  const t = useCountdown(target);
  return (
    <span className={`font-mono text-xs tabular-nums ${t.done ? "text-muted" : "text-ink"}`}>
      {formatCompactCountdown(t.totalMs)}
    </span>
  );
}

function matchFilter(phase: LicitacionPhase, filter: FilterValue): boolean {
  if (filter === "ALL") return true;
  if (filter === "ACTIVE") return phase === "OPEN" || phase === "REVEALING";
  if (filter === "DRAFT") return phase === "DRAFT";
  return phase === "CLOSED";
}

export function BuyerDashboardView() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterValue>(DashboardFilter.ALL);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { licitaciones, loading, refresh } = useLicitaciones();

  const mine = user
    ? licitaciones.filter(
        (l) => !l.organizerId || l.organizerId === user.id,
      )
    : licitaciones;
  const rows = mine.filter((licitacion) =>
    matchFilter(licitacion.phase, filter),
  );

  const activeNow = mine.filter((l) =>
    matchFilter(l.phase, "ACTIVE"),
  ).length;
  const revealingNow = mine.filter((l) => l.phase === "REVEALING").length;
  const avgProviders = (
    mine
      .filter((l) => l.providers.length > 0)
      .reduce((acc, l) => acc + l.providers.length, 0) /
    Math.max(1, mine.filter((l) => l.providers.length > 0).length)
  ).toFixed(1);

  return (
    <main className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark">
            Panel licitante
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
            Mis licitaciones
          </h1>
          <p className="mt-1 text-sm text-muted">
            {user?.email ?? "Acme Corp S.A. · RUC 20555443321"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-colors hover:bg-brand-dark"
        >
          <IconPlus className="size-4" />
          Nueva licitación
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total publicadas"
          value="12"
          sub="este año"
          icon={<IconCheck className="size-4" />}
        />
        <KpiCard
          label="Activas ahora"
          value={activeNow}
          sub={revealingNow > 0 ? `${revealingNow} en revelación` : "todas en fase sellada"}
          accent="text-brand-dark"
          icon={<IconClock className="size-4" />}
        />
        <KpiCard
          label="Proveedores promedio"
          value={avgProviders}
          sub="por licitación"
          icon={<IconUsers className="size-4" />}
        />
        <KpiCard
          label="Ahorro estimado"
          value="18%"
          sub="vs. precio de referencia"
          accent="text-brand-dark"
          icon={<IconTrendingDown className="size-4" />}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Licitaciones
            </h2>
            <p className="text-xs text-muted">
              Licitaciones demo y creadas por tu organización
            </p>
          </div>
          <FilterPills value={filter} onChange={setFilter} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-5 py-3 font-semibold">ID</th>
                <th className="px-5 py-3 font-semibold">Título</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Proveedores</th>
                <th className="px-5 py-3 font-semibold">Tiempo restante</th>
                <th className="px-5 py-3 font-semibold">Presupuesto ref.</th>
                <th className="px-5 py-3 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">
                    Cargando licitaciones…
                  </td>
                </tr>
              )}
              {rows.map((licitacion) => (
                <tr key={licitacion.id} className="transition-colors hover:bg-mist/60">
                  <td className="px-5 py-3.5 font-mono text-xs font-medium text-brand-dark">
                    {licitacion.id}
                  </td>
                  <td className="max-w-64 px-5 py-3.5">
                    <p className="truncate font-medium text-ink">
                      {licitacion.title}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <PhaseBadge phase={licitacion.phase} />
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-navy/70">
                    {licitacion.providers.length}
                  </td>
                  <td className="px-5 py-3.5">
                    {licitacion.phase === "DRAFT" || licitacion.phase === "CLOSED" ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <CountdownCell
                        target={
                          licitacion.phase === "REVEALING"
                            ? licitacion.revealEnd
                            : licitacion.commitEnd
                        }
                      />
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-navy/70">
                    {formatSoles(licitacion.budget)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/licitabien/licitaciones/${licitacion.id}`}
                      className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand/50 hover:text-brand-dark"
                    >
                      {licitacion.phase === "CLOSED"
                        ? "Ver resultados"
                        : "Ver detalle"}
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">
                    No hay licitaciones en este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <LicitacionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onPublished={refresh}
      />
    </main>
  );
}
