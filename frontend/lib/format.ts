import type { InvoiceStatus } from "./types";

const currencyFmt = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 2,
});

const currencyFmtCache = new Map<string, Intl.NumberFormat>();

export function formatMoney(
  value: string | number,
  currency: string = "PEN",
): string {
  const number = typeof value === "string" ? Number(value) : value;
  const formatter =
    currency === "PEN"
      ? currencyFmt
      : currencyFmtCache.get(currency) ??
        (() => {
          const fmt = new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
          });
          currencyFmtCache.set(currency, fmt);
          return fmt;
        })();
  return formatter.format(Number.isFinite(number) ? number : 0);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function shortHash(hash: string, head = 6): string {
  if (!hash) return "—";
  return hash.length > head + 8 ? `${hash.slice(0, head)}…${hash.slice(-4)}` : hash;
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: "Pendiente",
  VALIDATED: "Validada",
  BLOCKED: "Bloqueada",
};

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PENDING: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  VALIDATED: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  BLOCKED: "bg-rose-400/15 text-rose-300 border-rose-400/30",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
