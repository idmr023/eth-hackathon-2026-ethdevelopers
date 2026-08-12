"use client";

import type { PodiumEntry } from "@/lib/licitabien/types";
import { formatSoles } from "@/lib/licitabien/format";
import { arbiscanAddressUrl } from "@/lib/licitabien/chain";
import { useChainId } from "wagmi";
import { IconExternal, IconSparkles, IconTrophy } from "./icons";

const MEDALS: Record<PodiumEntry["rank"], { label: string; chip: string }> = {
  1: { label: "Ganador", chip: "bg-amber-400 text-amber-950 border-amber-500/40" },
  2: { label: "Segundo", chip: "bg-slate-200 text-slate-700 border-slate-300" },
  3: { label: "Tercero", chip: "bg-orange-200 text-orange-900 border-orange-300" },
};

export function Podium({
  entries,
  budget,
  contractAddress,
}: {
  entries: PodiumEntry[];
  budget: number;
  contractAddress: string;
}) {
  const chainId = useChainId();
  const winner = entries[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <IconTrophy className="size-5 text-amber-500" />
        <h3 className="font-display text-base font-bold text-ink">
          Resultados finales
        </h3>
      </div>

      {winner && (
        <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950">
                <IconTrophy className="size-3.5" /> {MEDALS[winner.rank].label}
              </span>
              <h4 className="mt-2 font-display text-2xl font-bold text-ink">
                {winner.name}
              </h4>
              <p className="mt-0.5 text-sm text-muted">
                Monto revelado · {formatSoles(winner.amount)}
              </p>
              {winner.finalScore != null && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-dark">
                  <IconSparkles className="size-3" />
                  Score compuesto {winner.finalScore}/100
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Ahorro vs. presupuesto
              </p>
              <p className="font-mono text-3xl font-bold text-brand-dark">
                {winner.savings}%
              </p>
              <p className="text-xs text-muted">
                vs. {formatSoles(budget)}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
            <div className="min-w-0">
              {winner.winnerReason && (
                <p className="mb-1 text-xs text-muted">
                  {winner.winnerReason}
                </p>
              )}
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Hash de la oferta ganadora
              </p>
              <p className="font-mono text-xs text-ink">{winner.commitmentHash}</p>
            </div>
            <a
              href={arbiscanAddressUrl(contractAddress, chainId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink"
            >
              <IconExternal className="size-4" />
              Ver prueba en Arbiscan
            </a>
          </div>
        </div>
      )}

      <ol className="space-y-2">
        {entries.slice(1).map((entry) => (
          <li
            key={entry.rank}
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex size-6 items-center justify-center rounded-full border text-[11px] font-bold ${MEDALS[entry.rank].chip}`}
              >
                {entry.rank}
              </span>
              <span className="text-sm font-medium text-ink">{entry.name}</span>
            </div>
            <div className="flex items-center gap-4 font-mono text-xs text-muted">
              <span className="tabular-nums">{formatSoles(entry.amount)}</span>
              <span className="text-brand-dark">−{entry.savings}%</span>
              {entry.finalScore != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                  <IconSparkles className="size-3" />
                  {entry.finalScore}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
