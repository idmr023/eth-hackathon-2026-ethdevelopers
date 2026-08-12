import type { Licitacion } from "./types";

function inHours(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export const licitaciones: Licitacion[] = [
  {
    id: "LIC-2026-001",
    title: "Suministro de materiales de oficina Q3 2026",
    category: "Papelería y suministros",
    phase: "OPEN",
    budget: 850_000,
    commitEnd: inHours(3 * 24),
    revealEnd: inHours(4 * 24),
    description:
      "Compra trimestral de papelería, tinta, tóner y materiales de oficina para 12 sedes a nivel nacional.",
    providers: [
      { id: "pv-01", name: "Suministros Global SAC", committed: true, commitmentHash: "0x11b4879a…8b41", amount: null, qualityScore: null },
      { id: "pv-02", name: "TechSolutions SAC", committed: true, commitmentHash: "0x7ec219f0…a3f2", amount: null, qualityScore: null },
    ],
  },
  {
    id: "LIC-2026-002",
    title: "Auditoría de seguridad informática 2026",
    category: "Consultoría y seguridad TI",
    phase: "OPEN",
    budget: 320_000,
    commitEnd: inHours(5 * 24),
    revealEnd: inHours(6 * 24),
    description:
      "Auditoría externa de seguridad informática, pentesting de infraestructura cloud y evaluación ISO 27001.",
    providers: [
      { id: "pv-04", name: "SeguridadCorp SAC", committed: true, commitmentHash: "0xd4e5f6a7…12ab", amount: null, qualityScore: null },
    ],
  },
];
