export const LicitacionPhase = {
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  REVEALING: "REVEALING",
  CLOSED: "CLOSED",
} as const;

export type LicitacionPhase =
  (typeof LicitacionPhase)[keyof typeof LicitacionPhase];

export const PHASE_LABELS: Record<LicitacionPhase, string> = {
  DRAFT: "Borrador",
  OPEN: "Abierta a compromisos",
  REVEALING: "En revelación",
  CLOSED: "Cerrada",
};

export interface AiEvaluation {
  score: number;
  criteria: {
    technicalQuality: number;
    compliance: number;
    delivery: number;
    costJustification: number;
  };
  summary: string;
  model: string;
}

export interface LicitacionProveedor {
  id: string;
  name: string;
  committed: boolean;
  commitmentHash: string;
  amount: number | null;
  qualityScore: number | null;
  userId?: string | null;
  proposalFileName?: string | null;
  proposalSize?: number | null;
  aiScore?: number | null;
  aiEvaluation?: AiEvaluation | null;
  priceScore?: number | null;
  finalScore?: number | null;
  winnerReason?: string | null;
}

export interface Licitacion {
  id: string;
  title: string;
  category: string;
  phase: LicitacionPhase;
  budget: number;
  providers: LicitacionProveedor[];
  commitEnd: string;
  revealEnd: string;
  description?: string;
  organizerId?: string | null;
  winnerId?: string;
  winningAmount?: number;
}

export interface PodiumEntry {
  rank: 1 | 2 | 3;
  name: string;
  amount: number;
  savings: number;
  commitmentHash: string;
  aiScore?: number | null;
  finalScore?: number | null;
  winnerReason?: string | null;
}

export interface Credential {
  id: string;
  title: string;
  description: string;
  issuer: string;
  attestedAt: string;
  badge: "gold" | "green" | "navy";
}

export const PHASE_TONES: Record<
  LicitacionPhase,
  { chip: string; dot: string }
> = {
  DRAFT: { chip: "bg-mist text-muted border-border", dot: "bg-muted" },
  OPEN: {
    chip: "bg-brand-soft text-brand-dark border-brand/30",
    dot: "bg-brand",
  },
  REVEALING: {
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  CLOSED: {
    chip: "bg-navy/5 text-navy/70 border-navy/10",
    dot: "bg-navy/40",
  },
};

export function isPhaseActive(phase: LicitacionPhase): boolean {
  return phase === "OPEN" || phase === "REVEALING";
}
