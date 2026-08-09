import { describe, it, expect } from "vitest";
import {
  pad2,
  toCountdownParts,
  formatCountdownText,
  formatCompactCountdown,
  formatSoles,
} from "./format";

describe("pad2", () => {
  it("rellena con ceros a la izquierda", () => {
    expect(pad2(0)).toBe("00");
    expect(pad2(9)).toBe("09");
    expect(pad2(42)).toBe("42");
  });

  it("no acepta negativos", () => {
    expect(pad2(-5)).toBe("00");
  });
});

describe("toCountdownParts", () => {
  it("descompone milisegundos en D/H/M/S", () => {
    const ms =
      (2 * 86400 + 14 * 3600 + 37 * 60 + 9) * 1000;
    const parts = toCountdownParts(ms);
    expect(parts.days).toBe("02");
    expect(parts.hours).toBe("14");
    expect(parts.minutes).toBe("37");
    expect(parts.seconds).toBe("09");
    expect(parts.done).toBe(false);
  });

  it("marca done cuando se agota el tiempo", () => {
    expect(toCountdownParts(0).done).toBe(true);
    expect(toCountdownParts(-5000).done).toBe(true);
    expect(toCountdownParts(-5000).totalMs).toBe(0);
  });
});

describe("formatCountdownText", () => {
  it("formatea en formato terminal", () => {
    const ms = (2 * 86400 + 14 * 3600 + 37 * 60 + 9) * 1000;
    expect(formatCountdownText(ms)).toBe(
      "02 DÍAS : 14 HRS : 37 MIN : 09 SEG",
    );
  });
});

describe("formatCompactCountdown", () => {
  it("acorta a días/horas", () => {
    const ms = (2 * 86400 + 14 * 3600) * 1000;
    expect(formatCompactCountdown(ms)).toBe("02d 14h 00m");
  });

  it("acorta a horas/minutos cuando faltan < 1 día", () => {
    const ms = (3 * 3600 + 12 * 60) * 1000;
    expect(formatCompactCountdown(ms)).toBe("03h 12m");
  });

  it("devuelve — cuando terminó", () => {
    expect(formatCompactCountdown(0)).toBe("—");
  });
});

describe("formatSoles", () => {
  it("formatea montos en soles peruanos", () => {
    expect(formatSoles(8500000)).toMatch(/8[.,]500[.,]000/);
  });

  it("no lanza con valores no finitos", () => {
    expect(() => formatSoles(Number.NaN)).not.toThrow();
    expect(formatSoles(Number.NaN)).toMatch(/0/);
  });
});
