export interface CountdownParts {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  totalMs: number;
  done: boolean;
}

export function pad2(value: number): string {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

export function toCountdownParts(ms: number): CountdownParts {
  const totalMs = Math.max(0, ms);
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days: pad2(days),
    hours: pad2(hours),
    minutes: pad2(minutes),
    seconds: pad2(seconds),
    totalMs,
    done: totalSeconds <= 0,
  };
}

export function formatCountdownText(ms: number): string {
  const parts = toCountdownParts(ms);
  return `${parts.days} DÍAS : ${parts.hours} HRS : ${parts.minutes} MIN : ${parts.seconds} SEG`;
}

const solesFmt = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});

export function formatSoles(value: number): string {
  return solesFmt.format(Number.isFinite(value) ? value : 0);
}

export function formatCompactCountdown(ms: number): string {
  const parts = toCountdownParts(ms);
  if (parts.done) return "—";
  if (parts.days !== "00") return `${parts.days}d ${parts.hours}h ${parts.minutes}m`;
  return `${parts.hours}h ${parts.minutes}m`;
}
