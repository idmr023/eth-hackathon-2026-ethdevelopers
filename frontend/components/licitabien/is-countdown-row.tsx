"use client";

import { useCountdown } from "@/lib/licitabien/use-countdown";
import { ANIM } from "@/lib/animations";
import { IconClock } from "./icons";

function Unit({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="flex min-w-16 flex-col items-center rounded-lg bg-white/10 px-2.5 py-2 text-center">
      <span className="font-mono text-2xl font-bold tabular-nums leading-none">
        {value}
      </span>
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">
        {unit}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span className={`pb-4 font-mono text-xl text-brand ${ANIM.blink}`}>:</span>
  );
}

export function CountdownRow({
  target,
  label = "Cierre de compromisos",
}: {
  target: string;
  label?: string;
}) {
  const t = useCountdown(target);

  return (
    <div className="rounded-xl bg-navy px-5 py-4 text-white shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-2">
        <IconClock className="size-3.5 text-brand" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">
          {label}
        </p>
      </div>
      <div className="flex items-center justify-between gap-1">
        <Unit value={t.days} unit="DÍAS" />
        <Separator />
        <Unit value={t.hours} unit="HRS" />
        <Separator />
        <Unit value={t.minutes} unit="MIN" />
        <Separator />
        <Unit value={t.seconds} unit="SEG" />
      </div>
    </div>
  );
}
