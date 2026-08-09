"use client";

import type { RwaAsset } from "@/lib/licitabien/types";
import { formatSoles } from "@/lib/licitabien/format";
import { arbiscanTokenUrl } from "@/lib/licitabien/chain";
import { useChainId } from "wagmi";
import { IconCoins, IconExternal } from "./icons";
import { ChainBadge } from "./is-chain-badge";

export function RwaCard({ asset }: { asset: RwaAsset }) {
  const chainId = useChainId();

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-navy">
          <IconCoins className="size-4 text-brand" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            Activo digital generado
          </p>
          <h3 className="font-display text-sm font-bold text-ink">
            Financiamiento Inteligente · Adelanto de Liquidez
          </h3>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-brand/40 bg-brand-soft/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-xs text-brand-dark">{asset.id}</p>
            <p className="text-xs text-navy/70">
              Orden de Compra Tokenizada · comprador {asset.buyer}
            </p>
          </div>
          <p className="font-mono text-lg font-bold text-ink">
            {formatSoles(asset.amount)}
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <ChainBadge
            href={arbiscanTokenUrl(asset.contractAddress, chainId, asset.tokenId)}
            label={`Token #${asset.tokenId}`}
          />
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-dark">
            Verificado on-chain <IconExternal className="size-3" />
          </span>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
      >
        Solicitar adelanto (Factoring)
      </button>
      <p className="mt-2.5 text-xs leading-relaxed text-muted">
        Tu orden de compra adjudicada es ahora un activo digital verificable que
        te permite acceder a capital de trabajo instantáneo a través de fondos
        descentralizados, sin evaluaciones bancarias de 30 días.
      </p>
    </div>
  );
}
