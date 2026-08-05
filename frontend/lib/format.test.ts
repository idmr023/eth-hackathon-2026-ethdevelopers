import { describe, it, expect } from "vitest";
import { formatMoney, formatDate, shortHash, initials } from "./format";

describe("formatMoney", () => {
  it("formatea PEN por defecto", () => {
    expect(formatMoney("12500")).toMatch(/12[.,]500/);
  });

  it("formatea USD cuando se indica la moneda", () => {
    expect(formatMoney(12500, "USD")).toContain("USD");
    expect(formatMoney(12500, "USD")).toMatch(/12[.,]500/);
  });

  it("devuelve 0 para valores no numéricos", () => {
    expect(formatMoney("abc")).toMatch(/0/);
  });
});

describe("formatDate", () => {
  it("formatea fechas ISO", () => {
    const date = new Date("2026-08-04T10:30:00Z");
    const output = formatDate(date.toISOString());
    expect(output).toContain("2026");
  });
});

describe("shortHash", () => {
  it("acorta hashes largos", () => {
    const hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef";
    expect(shortHash(hash)).toMatch(/^0x1234…/);
  });

  it("devuelve — para vacíos", () => {
    expect(shortHash("")).toBe("—");
  });

  it("devuelve el valor completo si es corto", () => {
    expect(shortHash("abc")).toBe("abc");
  });
});

describe("initials", () => {
  it("toma las iniciales de las dos primeras palabras", () => {
    expect(initials("Ana María Torres")).toBe("AM");
  });
});
