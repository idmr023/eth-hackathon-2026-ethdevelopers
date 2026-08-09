import type { InvoiceStatus } from "./types";

const currencyFmt = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 2,
});

const currencyFmtCache = new Map<string, Intl.NumberFormat>();

// Tokens a código ISO 4217: Intl.NumberFormat solo acepta divisas fiat.
const TOKEN_TO_ISO: Record<string, string> = {
  USDC: "USD",
  USDT: "USD",
  DAI: "USD",
};

export function formatMoney(
  value: string | number,
  currency: string = "PEN",
): string {
  const number = typeof value === "string" ? Number(value) : value;
  const safe = Number.isFinite(number) ? number : 0;
  const iso = TOKEN_TO_ISO[currency] ?? currency;
  const formatter =
    iso === "PEN"
      ? currencyFmt
      : currencyFmtCache.get(iso) ??
        (() => {
          try {
            const fmt = new Intl.NumberFormat("es-PE", {
              style: "currency",
              currency: iso,
              maximumFractionDigits: 2,
            });
            currencyFmtCache.set(iso, fmt);
            return fmt;
          } catch {
            const fmt = new Intl.NumberFormat("es-PE", {
              maximumFractionDigits: 2,
            });
            currencyFmtCache.set(iso, fmt);
            return fmt;
          }
        })();
  return formatter.format(safe);
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
  PENDING: "bg-amber-400/15 text-amber-700 border-amber-400/30",
  VALIDATED: "bg-emerald-400/15 text-emerald-700 border-emerald-400/30",
  BLOCKED: "bg-rose-400/15 text-rose-700 border-rose-400/30",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
