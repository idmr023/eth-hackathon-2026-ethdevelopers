import type { CSSProperties } from "react";

// Animaciones centralizadas del frontend (ver app/globals.css para los keyframes).
export const ANIM = {
  fadeUp: "anim-fade-up",
  pulseDot: "anim-pulse-dot",
  blink: "anim-blink",
  checkPop: "anim-check-pop",
  growBar: "anim-grow-bar",
  floatSlow: "anim-float-slow",
} as const;

export type AnimName = keyof typeof ANIM;

/**
 * Clases + retardo escalonado para entradas en listas.
 * Ej.: `const { className, style } = staggered(3, 60)` para la fila 3.
 */
export function staggered(index: number, stepMs = 60, anim: AnimName = "fadeUp"): {
  className: string;
  style: CSSProperties;
} {
  return {
    className: ANIM[anim],
    style: { animationDelay: `${index * stepMs}ms` },
  };
}
