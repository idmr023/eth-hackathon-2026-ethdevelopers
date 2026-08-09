import { IconCheck } from "./icons";

const STEPS = ["Publicada", "Compromisos", "Revelación", "Resultado"] as const;

export function Timeline({ current }: { current: number }) {
  const index = Math.max(0, Math.min(current, STEPS.length - 1));

  return (
    <ol className="flex items-start gap-0">
      {STEPS.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li key={step} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={`h-0.5 flex-1 rounded-full ${
                  i === 0 ? "bg-transparent" : done || active ? "bg-brand" : "bg-border"
                }`}
              />
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  done
                    ? "border-brand bg-brand text-white"
                    : active
                      ? "border-brand bg-brand-soft text-brand-dark anim-pulse-dot"
                      : "border-border bg-surface text-muted"
                }`}
              >
                {done ? <IconCheck className="size-3.5" /> : i + 1}
              </span>
              <span
                className={`h-0.5 flex-1 rounded-full ${
                  i === STEPS.length - 1 ? "bg-transparent" : done ? "bg-brand" : "bg-border"
                }`}
              />
            </div>
            <span
              className={`mt-2 text-[11px] font-semibold ${
                done || active ? "text-brand-dark" : "text-muted"
              }`}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
