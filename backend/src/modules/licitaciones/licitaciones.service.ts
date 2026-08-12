import { Injectable, Logger } from '@nestjs/common';
import { LicitacionPhase, Prisma } from '@prisma/client';
import { keccak256, toHex } from 'viem';
import { AppError, ErrorCodes } from '../../common/errors';
import { PrismaService } from '../../shared/prisma.service';
import { AiEvaluationService } from '../proposals/ai-evaluation.service';
import type { ProposalEvaluation } from '../proposals/ai-evaluation.service';
import { PdfTextService } from '../proposals/pdf-text.service';
import { ProposalStorageService } from '../proposals/proposal-storage.service';

export interface CreateLicitacionInput {
  title: string;
  category: string;
  budget: number;
  commitEnd: string;
  revealEnd: string;
  description?: string;
  organizerId: string;
}

export interface ProposalFileInput {
  buffer: Buffer;
  mimetype: string;
  originalName: string;
  size: number;
}

export interface JoinLicitacionInput {
  licitacionId: string;
  bidderName: string;
  amount: number;
  userId: string;
  proposal: ProposalFileInput | null;
}

export interface RevealLicitacionInput {
  licitacionId: string;
  amount: number;
  userId: string;
}

export interface ProviderEntry {
  id: string;
  name: string;
  userId: string;
  committed: boolean;
  commitmentHash: string;
  amount: number | null;
  qualityScore: number | null;
  proposalS3Key?: string | null;
  proposalFileName?: string | null;
  proposalSize?: number | null;
  aiScore?: number | null;
  aiEvaluation?: ProposalEvaluation | null;
  evaluatedAt?: string | null;
  priceScore?: number | null;
  finalScore?: number | null;
  winnerReason?: string | null;
}

type LicitacionRow = Prisma.LicitacionGetPayload<Record<string, never>>;

@Injectable()
export class LicitacionesService {
  private readonly logger = new Logger(LicitacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ProposalStorageService,
    private readonly pdfText: PdfTextService,
    private readonly ai: AiEvaluationService,
  ) {}

  async list() {
    const licitaciones = await this.prisma.licitacion.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    for (const l of licitaciones) {
      await this.transitionPhase(l, now);
    }
    const refreshed = await this.prisma.licitacion.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return refreshed.map((l) => this.serialize(l));
  }

  async getById(id: string) {
    const licitacion = await this.prisma.licitacion.findUnique({
      where: { id },
    });
    if (!licitacion) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Licitación no encontrada');
    }
    await this.transitionPhase(licitacion, new Date());
    const updated = await this.prisma.licitacion.findUnique({
      where: { id },
    });
    return this.serialize(updated!);
  }

  private async transitionPhase(licitacion: LicitacionRow, now: Date) {
    if (
      licitacion.phase === LicitacionPhase.OPEN &&
      now >= licitacion.commitEnd
    ) {
      await this.prisma.licitacion.update({
        where: { id: licitacion.id },
        data: { phase: LicitacionPhase.REVEALING },
      });
      this.logger.log(`Fase transicionada a REVEALING: ${licitacion.id}`);
      // Al abrir la revelación se evalúan las propuestas PDF con IA. Un fallo
      // por proveedor no aborta el resto; sin AI/almacenamiento se omite.
      await this.evaluatePending(licitacion.id);
    } else if (
      licitacion.phase === LicitacionPhase.REVEALING &&
      now >= licitacion.revealEnd
    ) {
      await this.closeLicitacion(licitacion);
    }
  }

  private async evaluatePending(licitacionId: string): Promise<void> {
    const licitacion = await this.prisma.licitacion.findUnique({
      where: { id: licitacionId },
    });
    if (!licitacion || licitacion.phase === LicitacionPhase.OPEN) return;
    if (!this.storage.enabled) {
      this.logger.log(
        `Almacenamiento desactivado: sin evaluación IA en ${licitacionId}`,
      );
      return;
    }
    const providers = (licitacion.providers ??
      []) as unknown as ProviderEntry[];
    let changed = false;
    for (const provider of providers) {
      if (!provider.proposalS3Key || provider.evaluatedAt) continue;
      try {
        const stored = await this.storage.download(licitacionId, provider.id);
        if (!stored) continue;
        const text = await this.pdfText.extract(stored.buffer);
        const evaluation = await this.ai.evaluate(text, {
          title: licitacion.title,
          category: licitacion.category,
          description: licitacion.description ?? undefined,
          budget: licitacion.budget,
        });
        provider.aiScore = evaluation.score;
        provider.aiEvaluation = evaluation;
        provider.qualityScore = evaluation.score;
        provider.evaluatedAt = new Date().toISOString();
        changed = true;
      } catch (cause) {
        this.logger.error(
          `Fallo evaluación IA de ${provider.id} en ${licitacionId}: ${
            (cause as Error).message
          }`,
        );
      }
    }
    if (changed) {
      await this.prisma.licitacion.update({
        where: { id: licitacionId },
        data: { providers: providers as unknown as Prisma.InputJsonValue },
      });
      this.logger.log(`Evaluación IA completada en ${licitacionId}`);
    }
  }

  private async closeLicitacion(licitacion: LicitacionRow): Promise<void> {
    const providers = (licitacion.providers ??
      []) as unknown as ProviderEntry[];
    const revealed = providers.filter(
      (p) => typeof p.amount === 'number' && p.amount > 0,
    );
    let winnerId: string | null = null;
    let winningAmount: number | null = null;

    if (revealed.length > 0) {
      const minAmount = Math.min(...revealed.map((p) => p.amount!));
      let best: ProviderEntry | null = null;
      let bestScore = -1;

      for (const provider of revealed) {
        const priceScore = (minAmount / provider.amount!) * 100;
        const hasAi =
          provider.aiScore !== null && provider.aiScore !== undefined;
        const finalScore = hasAi
          ? 0.5 * priceScore + 0.5 * provider.aiScore!
          : priceScore;
        provider.priceScore = Math.round(priceScore * 10) / 10;
        provider.finalScore = Math.round(finalScore * 10) / 10;
        if (finalScore > bestScore) {
          bestScore = finalScore;
          best = provider;
        }
      }

      // Desempate: mismo puntaje compuesto → gana el monto menor.
      const tied = revealed.filter(
        (p) => Math.abs((p.finalScore ?? -1) - bestScore) < 1e-9,
      );
      if (tied.length > 1) {
        best = tied.reduce((a, b) => (a.amount! < b.amount! ? a : b));
      }

      if (best) {
        best.winnerReason = this.buildWinnerReason(best);
        winnerId = best.id;
        winningAmount = best.amount;
      }
    }

    await this.prisma.licitacion.update({
      where: { id: licitacion.id },
      data: {
        phase: LicitacionPhase.CLOSED,
        winnerId,
        winningAmount,
        providers: providers as unknown as Prisma.InputJsonValue,
      },
    });
    this.logger.log(`Fase transicionada a CLOSED: ${licitacion.id}`);
  }

  private buildWinnerReason(provider: ProviderEntry): string {
    const price = provider.priceScore?.toFixed(1) ?? '—';
    const ai = provider.aiScore?.toFixed(0) ?? '—';
    const weight = provider.aiScore != null ? '50%' : '100%';
    const aiPart =
      provider.aiScore != null
        ? `IA ${ai} (50%)`
        : 'IA no evaluada (100% precio)';
    return `Puntaje compuesto ${provider.finalScore?.toFixed(1) ?? '—'} = precio ${price} (50%) · ${aiPart}. Ponderación ${weight}.`;
  }

  async create(input: CreateLicitacionInput) {
    const commitEnd = new Date(input.commitEnd);
    const revealEnd = new Date(input.revealEnd);
    if (
      Number.isNaN(commitEnd.getTime()) ||
      Number.isNaN(revealEnd.getTime())
    ) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'Fechas de cierre inválidas',
      );
    }

    const licitacion = await this.prisma.licitacion.create({
      data: {
        title: input.title,
        category: input.category,
        budget: input.budget,
        phase: LicitacionPhase.OPEN,
        commitEnd,
        revealEnd,
        description: input.description ?? null,
        providers: [],
        organizerId: input.organizerId,
      },
    });
    this.logger.log(`Licitación creada: ${licitacion.id}`);
    return this.serialize(licitacion);
  }

  async join(input: JoinLicitacionInput) {
    const licitacion = await this.prisma.licitacion.findUnique({
      where: { id: input.licitacionId },
    });
    if (!licitacion) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Licitación no encontrada');
    }
    if (licitacion.phase !== LicitacionPhase.OPEN) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'La licitación no acepta nuevas ofertas',
      );
    }

    // Anti-auto-oferta: el organizador no puede ofertar en su propia licitación.
    if (licitacion.organizerId && licitacion.organizerId === input.userId) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'No puedes ofertar en tu propia licitación',
      );
    }

    const providers = (licitacion.providers ??
      []) as unknown as ProviderEntry[];
    const bidderId = `P-${Date.now().toString(36).toUpperCase()}`;
    const existing = providers.find((entry) => {
      const provider = entry as { name?: string; userId?: string };
      return (
        provider.name === input.bidderName || provider.userId === input.userId
      );
    });
    if (existing) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'Ya presentaste una oferta para esta licitación',
      );
    }

    const commitmentHash = keccak256(
      toHex(`${input.bidderName}:${input.amount}:${licitacion.id}`),
    );

    const provider: ProviderEntry = {
      id: bidderId,
      name: input.bidderName,
      userId: input.userId,
      committed: true,
      commitmentHash: `${commitmentHash.slice(0, 18)}…${commitmentHash.slice(-4)}`,
      // El monto se persiste de forma segura y se auto-revela al pasar la
      // fecha de cierre de compromisos (serialize lo enmascara en OPEN).
      amount: input.amount,
      qualityScore: null,
    };

    // La propuesta PDF es obligatoria y se adjunta en el mismo momento de
    // ofertar; no hay vía posterior para añadirla.
    if (!input.proposal) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'La propuesta técnica en PDF es obligatoria',
      );
    }
    if (!/^application\/pdf$/.test(input.proposal.mimetype)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'La propuesta debe ser un archivo PDF',
      );
    }
    if (!this.storage.enabled) {
      throw new AppError(
        ErrorCodes.SERVICE_UNAVAILABLE,
        503,
        'El almacenamiento de propuestas no está configurado',
      );
    }
    const key = await this.storage.upload(
      licitacion.id,
      bidderId,
      input.proposal.buffer,
      input.proposal.mimetype,
    );
    provider.proposalS3Key = key;
    provider.proposalFileName = input.proposal.originalName;
    provider.proposalSize = input.proposal.size;

    providers.push(provider);

    const updated = await this.prisma.licitacion.update({
      where: { id: licitacion.id },
      data: { providers: providers as unknown as Prisma.InputJsonValue },
    });
    this.logger.log(
      `Oferta presentada en ${licitacion.id} por ${input.bidderName}`,
    );
    return this.serialize(updated);
  }

  async reveal(input: RevealLicitacionInput) {
    const licitacion = await this.prisma.licitacion.findUnique({
      where: { id: input.licitacionId },
    });
    if (!licitacion) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Licitación no encontrada');
    }
    if (licitacion.phase !== LicitacionPhase.REVEALING) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'La licitación no está en fase de revelación',
      );
    }

    const providers = (licitacion.providers ?? []) as Prisma.JsonArray;
    const providerIndex = providers.findIndex((entry) => {
      if (typeof entry !== 'object' || entry === null) return false;
      const p = entry as { userId?: string };
      return p.userId === input.userId;
    });

    if (providerIndex === -1) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'No participas en esta licitación',
      );
    }

    const provider = providers[providerIndex] as {
      name: string;
      amount: number | null;
      commitmentHash: string;
      committed: boolean;
      [key: string]: unknown;
    };

    if (provider.amount !== null) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'Ya revelaste tu oferta',
      );
    }

    const commitmentHash = keccak256(
      toHex(`${provider.name}:${input.amount}:${licitacion.id}`),
    );
    const expectedHash = `${commitmentHash.slice(0, 18)}…${commitmentHash.slice(-4)}`;
    if (expectedHash !== provider.commitmentHash) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'El monto no coincide con el compromiso sellado',
      );
    }

    providers[providerIndex] = { ...provider, amount: input.amount };

    const updated = await this.prisma.licitacion.update({
      where: { id: licitacion.id },
      data: { providers },
    });
    this.logger.log(`Oferta revelada en ${licitacion.id} por ${provider.name}`);
    return this.serialize(updated);
  }

  async downloadProposal(
    licitacionId: string,
    providerId: string,
    userId: string,
  ) {
    const licitacion = await this.prisma.licitacion.findUnique({
      where: { id: licitacionId },
    });
    if (!licitacion) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Licitación no encontrada');
    }
    const providers = (licitacion.providers ??
      []) as unknown as ProviderEntry[];
    const provider = providers.find((p) => p.id === providerId);
    if (!provider || !provider.proposalS3Key) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Propuesta no encontrada');
    }
    if (licitacion.phase === LicitacionPhase.OPEN) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        403,
        'Las propuestas se publican tras el cierre de compromisos',
      );
    }
    const isParticipant = providers.some((p) => p.userId === userId);
    const isOrganizer = licitacion.organizerId === userId;
    if (!isParticipant && !isOrganizer) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        403,
        'No tienes acceso a esta propuesta',
      );
    }
    if (!this.storage.enabled) {
      throw new AppError(
        ErrorCodes.SERVICE_UNAVAILABLE,
        503,
        'Almacenamiento de propuestas no configurado',
      );
    }
    const stored = await this.storage.download(licitacionId, providerId);
    if (!stored) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Propuesta no disponible');
    }
    return {
      ...stored,
      fileName: provider.proposalFileName ?? stored.fileName,
    };
  }

  async evaluateNow(licitacionId: string) {
    const licitacion = await this.prisma.licitacion.findUnique({
      where: { id: licitacionId },
    });
    if (!licitacion) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Licitación no encontrada');
    }
    if (licitacion.phase === LicitacionPhase.OPEN) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        'La evaluación IA se habilita tras el cierre de compromisos',
      );
    }
    await this.evaluatePending(licitacionId);
    const updated = await this.prisma.licitacion.findUnique({
      where: { id: licitacionId },
    });
    return this.serialize(updated!);
  }

  private serialize(l: LicitacionRow) {
    const revealed =
      l.phase === LicitacionPhase.REVEALING ||
      l.phase === LicitacionPhase.CLOSED;
    const providers = (Array.isArray(l.providers) ? l.providers : []).map(
      (entry) => {
        if (!revealed && typeof entry === 'object' && entry !== null) {
          return {
            ...(entry as Record<string, unknown>),
            amount: null,
            proposalFileName: null,
            proposalSize: null,
            aiScore: null,
            aiEvaluation: null,
          };
        }
        return entry;
      },
    );
    return {
      id: l.id,
      title: l.title,
      category: l.category,
      budget: l.budget,
      phase: l.phase,
      commitEnd: l.commitEnd.toISOString(),
      revealEnd: l.revealEnd.toISOString(),
      description: l.description,
      organizerId: l.organizerId,
      winnerId: l.winnerId,
      winningAmount: l.winningAmount,
      providers,
      createdAt: l.createdAt.toISOString(),
    };
  }
}
