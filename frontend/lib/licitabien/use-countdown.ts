"use client";

import { useSyncExternalStore } from "react";
import { toCountdownParts, type CountdownParts } from "./format";

function subscribeNow(onChange: () => void): () => void {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}

function getNowSnapshot(): number {
  return Date.now();
}

export function useCountdown(target: string | number | null): CountdownParts {
  const now = useSyncExternalStore(subscribeNow, getNowSnapshot, getNowSnapshot);
  const targetMs = target ? new Date(target).getTime() : null;

  if (targetMs === null) {
    return {
      days: "00",
      hours: "00",
      minutes: "00",
      seconds: "00",
      totalMs: 0,
      done: true,
    };
  }

  return toCountdownParts(targetMs - now);
}
