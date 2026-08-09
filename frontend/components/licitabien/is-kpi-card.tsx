import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent = "text-ink",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && <span className="text-brand-dark">{icon}</span>}
      </div>
      <p className={`mt-2 font-display text-3xl font-bold tabular-nums ${accent}`}>
        {value}
      </p>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
