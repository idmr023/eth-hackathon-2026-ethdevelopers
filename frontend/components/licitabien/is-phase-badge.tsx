import {
  PHASE_LABELS,
  PHASE_TONES,
  isPhaseActive,
  type LicitacionPhase,
} from "@/lib/licitabien/types";

export function PhaseBadge({ phase }: { phase: LicitacionPhase }) {
  const tone = PHASE_TONES[phase];
  const active = isPhaseActive(phase);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone.chip}`}
    >
      <span
        className={`size-1.5 rounded-full ${tone.dot} ${
          active ? "anim-pulse-dot" : "opacity-40"
        }`}
      />
      {PHASE_LABELS[phase]}
    </span>
  );
}
