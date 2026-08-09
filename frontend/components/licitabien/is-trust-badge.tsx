import { IconShield } from "./icons";

export function TrustBadge() {
  return (
    <div className="rounded-xl border border-brand/30 bg-brand-soft p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
          <IconShield className="size-5 text-brand-dark" />
        </span>
        <div>
          <h3 className="font-display text-sm font-bold text-ink">
            Garantía de Cero Manipulación (Trustless)
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-navy/70">
            A diferencia de los portales web tradicionales, aquí el código es la
            ley: tu oferta se sella matemáticamente y es{" "}
            <strong className="font-semibold text-ink">
              imposible que la plataforma o un desarrollador interno espíe o
              altere los montos
            </strong>{" "}
            para favorecer a un competidor.
          </p>
        </div>
      </div>
    </div>
  );
}
