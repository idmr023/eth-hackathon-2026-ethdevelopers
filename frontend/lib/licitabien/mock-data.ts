import type {
  Credential,
  Licitacion,
  PodiumEntry,
  RwaAsset,
} from "./types";

function inMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function inHours(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export const licitaciones: Licitacion[] = [
  {
    id: "LIC-2024-001",
    title: "Suministro de materiales de oficina Q4",
    category: "Papelería y suministros",
    phase: "OPEN",
    budget: 8_500_000,
    commitEnd: inHours(2 * 24 + 14).replace("Z", "Z"),
    revealEnd: inHours(2 * 24 + 15).replace("Z", "Z"),
    description:
      "Suministro trimestral de papelería, tinta y materiales de oficina para todas las sedes.",
    providers: [
      {
        id: "P-A",
        name: "Proveedor A",
        committed: true,
        commitmentHash: "0x11b4879a2f3c…8b41",
        amount: null,
        qualityScore: null,
      },
      {
        id: "P-B",
        name: "Proveedor B",
        committed: true,
        commitmentHash: "0x7ec219f0b041…a3f2",
        amount: null,
        qualityScore: null,
      },
      {
        id: "P-C",
        name: "Proveedor C",
        committed: true,
        commitmentHash: "0x3a6c4d9e21ff…09d7",
        amount: null,
        qualityScore: null,
      },
      {
        id: "P-D",
        name: "Proveedor D",
        committed: false,
        commitmentHash: "—",
        amount: null,
        qualityScore: null,
      },
    ],
  },
  {
    id: "LIC-2024-002",
    title: "Servicios de limpieza corporativa 2024",
    category: "Servicios generales",
    phase: "REVEALING",
    budget: 2_200_000,
    commitEnd: inHours(2 * 24 + 3).replace("Z", "Z"),
    revealEnd: inMinutes(3 * 60 + 12).replace("Z", "Z"),
    description:
      "Servicio integral de limpieza y mantenimiento de oficinas, 12 meses.",
    providers: [
      {
        id: "P-E",
        name: "Proveedor E",
        committed: true,
        commitmentHash: "0x88d1b2c3e4f5…71a0",
        amount: null,
        qualityScore: null,
      },
      {
        id: "P-F",
        name: "Proveedor F",
        committed: true,
        commitmentHash: "0x24a9c8d7e6f5…32b1",
        amount: null,
        qualityScore: null,
      },
      {
        id: "P-G",
        name: "Proveedor G",
        committed: true,
        commitmentHash: "0x5511ffaa22bb…44c2",
        amount: null,
        qualityScore: null,
      },
    ],
  },
  {
    id: "LIC-2024-003",
    title: "Renovación sala de juntas principal",
    category: "Obras y remodelación",
    phase: "DRAFT",
    budget: 15_000_000,
    commitEnd: "",
    revealEnd: "",
    description:
      "Renovación integral de la sala de juntas principal: mobiliario, AV y acústica.",
    providers: [],
  },
  {
    id: "LIC-2024-004",
    title: "Mantenimiento preventivo de equipos de cómputo",
    category: "Tecnología",
    phase: "CLOSED",
    budget: 4_800_000,
    commitEnd: inHours(30 * 24).replace("Z", "Z"),
    revealEnd: inHours(29 * 24).replace("Z", "Z"),
    description:
      "Mantenimiento preventivo y correctivo de parque tecnológico, 12 meses.",
    providers: [
      {
        id: "P-H",
        name: "Proveedor H",
        committed: true,
        commitmentHash: "0xab12cd34ef56…90aa",
        amount: 4_080_000,
        qualityScore: 92,
      },
      {
        id: "P-I",
        name: "Proveedor I",
        committed: true,
        commitmentHash: "0x77fe65dc43ba…12cc",
        amount: 4_310_000,
        qualityScore: 88,
      },
      {
        id: "P-J",
        name: "Proveedor J",
        committed: true,
        commitmentHash: "0x9911bb22cc33…dd44",
        amount: 4_520_000,
        qualityScore: 84,
      },
      {
        id: "P-K",
        name: "Proveedor K",
        committed: true,
        commitmentHash: "0xc3d4e5f6a7b8…9910",
        amount: 4_650_000,
        qualityScore: 79,
      },
      {
        id: "P-L",
        name: "Proveedor L",
        committed: true,
        commitmentHash: "0x1f2e3d4c5b6a…7788",
        amount: 4_790_000,
        qualityScore: 73,
      },
    ],
    winnerId: "P-H",
    winningAmount: 4_080_000,
  },
];

export const podio: PodiumEntry[] = [
  {
    rank: 1,
    name: "Proveedor H",
    amount: 4_080_000,
    savings: 15,
    commitmentHash: "0xab12cd34ef56…90aa",
  },
  {
    rank: 2,
    name: "Proveedor I",
    amount: 4_310_000,
    savings: 10.2,
    commitmentHash: "0x77fe65dc43ba…12cc",
  },
  {
    rank: 3,
    name: "Proveedor J",
    amount: 4_520_000,
    savings: 5.8,
    commitmentHash: "0x9911bb22cc33…dd44",
  },
];

export const proveedorDemo = {
  id: "P-H",
  name: "Proveedor H",
  ruc: "20123456789",
  winRate: 34,
  activeBids: 2,
  wonBids: 1,
};

export const rwaAsset: RwaAsset = {
  id: "OC-TKN-0042",
  contractName: "PurchaseOrderNFT",
  contractAddress: "0x80d5408c6a0496e7318b94613d11128ba9d844ff",
  tokenId: "42",
  amount: 4_080_000,
  buyer: "Acme Corp S.A.",
};

export const credentials: Credential[] = [
  {
    id: "EAS-0x7a1b",
    title: "Contrato $50k cumplido",
    description: "Entrega íntegra de licitación LIC-2024-004 verificada on-chain.",
    issuer: "Acme Corp S.A.",
    attestedAt: "2026-07-28",
    badge: "gold",
  },
  {
    id: "EAS-0x3f9c",
    title: "Proveedor Nivel Oro",
    description: "Top 10% de proveedores con mejor puntaje de calidad IA acumulado.",
    issuer: "Protocolo Licitabien",
    attestedAt: "2026-06-14",
    badge: "gold",
  },
  {
    id: "EAS-0x0c2d",
    title: "Cero incumplimientos (12 meses)",
    description: "Sin quiebres de entrega ni penalidades registradas en el último año.",
    issuer: "Red de Confianza Licitabien",
    attestedAt: "2026-07-01",
    badge: "green",
  },
  {
    id: "EAS-0x9e4f",
    title: "Pago puntual a subcontratistas",
    description: "Todas las obligaciones de pago a terceros confirmadas en plazo.",
    issuer: "Red de Confianza Licitabien",
    attestedAt: "2026-05-20",
    badge: "navy",
  },
];
