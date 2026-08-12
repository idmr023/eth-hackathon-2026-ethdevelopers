import type { Credential } from "@/lib/licitabien/types";
import { IconBadgeCheck, IconExternal, IconShield } from "./icons";
import { EAS_SCHEMA_UID } from "@/lib/web3/contracts/addresses";

const BADGE_STYLES: Record<
  Credential["badge"],
  { chip: string; icon: string }
> = {
  gold: {
    chip: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
  },
  green: {
    chip: "border-brand/30 bg-brand-soft",
    icon: "bg-brand/10 text-brand-dark",
  },
  navy: {
    chip: "border-navy/10 bg-navy/5",
    icon: "bg-navy text-brand",
  },
};

export function CredentialCard({ credential }: { credential: Credential }) {
  const style = BADGE_STYLES[credential.badge];

  return (
    <div
      className={`flex flex-col rounded-xl border p-5 shadow-[var(--shadow-card)] ${style.chip}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex size-9 items-center justify-center rounded-lg ${style.icon}`}
        >
          <IconBadgeCheck className="size-5" />
        </span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 font-mono text-[10px] text-muted">
          {credential.id}
        </span>
      </div>
      <h3 className="mt-3 font-display text-sm font-bold text-ink">
        {credential.title}
      </h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-navy/70">
        {credential.description}
      </p>
      <div className="mt-4 border-t border-black/5 pt-3 text-[11px] text-muted">
        <p>
          Emisor: <span className="font-medium text-ink">{credential.issuer}</span>
        </p>
        <p className="mt-0.5">Atestiguada el {credential.attestedAt} · {credential.badge === "gold" ? "Soberana" : "Verificable"}</p>
      </div>
    </div>
  );
}

export function ReputationHeader({ credentialUid }: { credentialUid?: string }) {
  const easExplorerUrl = credentialUid
    ? `https://sepolia.arbiscan.io/address/${EAS_SCHEMA_UID}#code`
    : undefined;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-navy p-6 text-white lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-brand/15">
          <IconShield className="size-6 text-brand" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">
            Reputación Verificable · Identidad Soberana
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/70">
            Esta reputación es 100% propiedad de tu empresa. A diferencia de los
            scores tradicionales donde la plataforma es dueña de los datos, tu
            historial comercial es{" "}
            <strong className="text-white">
              inmutable, portátil y demostrable
            </strong>{" "}
            ante cualquier entidad global mediante blockchain. Si Licitabien
            desapareciera, conservas tus credenciales para presentarlas a otros
            clientes o protocolos.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => {
            if (credentialUid) {
              navigator.clipboard.writeText(credentialUid);
            } else {
              alert("Aún no tienes credenciales on-chain. Participa en una licitación y gana un contrato para recibir tu primera insignia.");
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          <IconExternal className="size-4" />
          {credentialUid ? "Copiar UID" : "Exportar credencial"}
        </button>
        {easExplorerUrl && (
          <a
            href={easExplorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Verificar en explorador
          </a>
        )}
      </div>
    </div>
  );
}
