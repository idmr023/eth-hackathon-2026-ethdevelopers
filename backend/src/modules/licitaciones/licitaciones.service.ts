import { Injectable, Logger } from '@nestjs/common';
import { LicitacionPhase, Prisma } from '@prisma/client';
import { keccak256, toHex } from 'viem';
import { AppError, ErrorCodes } from '../../common/errors';
import { PrismaService } from '../../shared/prisma.service';

export interface CreateLicitacionInput {
  title: string;
  category: string;
  budget: number;
  commitEnd: string;
  revealEnd: string;
  description?: string;
  organizerId: string;
}

export interface JoinLicitacionInput {
  licitacionId: string;
  bidderName: string;
  amount: number;
  userId: string;
}

@Injectable()
export class LicitacionesService {
  private readonly logger = new Logger(LicitacionesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const licitaciones = await this.prisma.licitacion.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return licitaciones.map((l) => this.serialize(l));
  }

  async getById(id: string) {
    const licitacion = await this.prisma.licitacion.findUnique({
      where: { id },
    });
    if (!licitacion) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Licitación no encontrada');
    }
    return this.serialize(licitacion);
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

    const providers = (licitacion.providers ?? []) as Prisma.JsonArray;
    const bidderId = `P-${Date.now().toString(36).toUpperCase()}`;
    const existing = providers.find((entry) => {
      if (typeof entry !== 'object' || entry === null) return false;
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

    providers.push({
      id: bidderId,
      name: input.bidderName,
      userId: input.userId,
      committed: true,
      commitmentHash: `${commitmentHash.slice(0, 18)}…${commitmentHash.slice(-4)}`,
      amount: null,
      qualityScore: null,
    });

    const updated = await this.prisma.licitacion.update({
      where: { id: licitacion.id },
      data: { providers },
    });
    this.logger.log(
      `Oferta presentada en ${licitacion.id} por ${input.bidderName}`,
    );
    return this.serialize(updated);
  }

  private serialize(l: Prisma.LicitacionGetPayload<Record<string, never>>) {
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
      providers: l.providers,
      createdAt: l.createdAt.toISOString(),
    };
  }
}
