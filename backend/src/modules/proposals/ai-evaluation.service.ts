import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ProposalEvaluationContext {
  title: string;
  category: string;
  description?: string;
  budget: number;
}

export interface ProposalCriteria {
  technicalQuality: number;
  compliance: number;
  delivery: number;
  costJustification: number;
}

export interface ProposalEvaluation {
  score: number;
  criteria: ProposalCriteria;
  summary: string;
  model: string;
}

const DEFAULT_MODEL = 'llama-3.1-nemotron-70b-instruct:free';
const REQUEST_TIMEOUT_MS = 15_000;

// Evalúa la calidad de una propuesta PDF. Si hay OPENROUTER_API_KEY usa el
// modelo configurado con salida JSON estricta; ante cualquier fallo o ausencia
// de clave cae a una heurística determinista para no bloquear el flujo demo.
@Injectable()
export class AiEvaluationService {
  private readonly logger = new Logger(AiEvaluationService.name);
  private readonly apiKey: string | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('OPENROUTER_API_KEY') ?? null;
    this.model = config.get<string>('OPENROUTER_MODEL') || DEFAULT_MODEL;
  }

  get enabled(): boolean {
    return this.apiKey !== null;
  }

  async evaluate(
    text: string,
    context: ProposalEvaluationContext,
  ): Promise<ProposalEvaluation> {
    if (!this.apiKey) return this.heuristic(text);
    try {
      return await this.callOpenRouter(text, context);
    } catch (cause) {
      this.logger.warn(
        `OpenRouter falló (${(cause as Error).message}); usando heurística`,
      );
      return this.heuristic(text);
    }
  }

  private async callOpenRouter(
    text: string,
    context: ProposalEvaluationContext,
  ): Promise<ProposalEvaluation> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 700,
          messages: [
            {
              role: 'system',
              content: [
                'Eres un evaluador técnico de licitaciones peruanas.',
                'Responde SOLO con un objeto JSON sin markdown con estas claves:',
                'overallScore, technicalQuality, compliance, delivery,',
                'costJustification (números enteros 0-100) y summary (string ≤ 250 chars).',
              ].join(' '),
            },
            {
              role: 'user',
              content: [
                `Licitación: ${context.title}`,
                `Categoría: ${context.category}`,
                `Presupuesto de referencia: S/ ${context.budget}`,
                context.description ? `Alcance: ${context.description}` : '',
                '--- Propuesta del proveedor ---',
                text.slice(0, 12_000),
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('respuesta vacía');
      const raw = JSON.parse(content) as Record<string, unknown>;
      return this.normalize(raw, this.model);
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalize(
    raw: Record<string, unknown>,
    model: string,
  ): ProposalEvaluation {
    const num = (value: unknown): number => {
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.min(100, Math.round(n)));
    };
    return {
      score: num(raw.overallScore ?? raw.score),
      criteria: {
        technicalQuality: num(raw.technicalQuality),
        compliance: num(raw.compliance),
        delivery: num(raw.delivery),
        costJustification: num(raw.costJustification),
      },
      summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 250) : '',
      model,
    };
  }

  private heuristic(text: string): ProposalEvaluation {
    const t = text.toLowerCase();
    const words = text.trim().split(/\s+/).filter(Boolean).length;

    const hasTechnical =
      /\b(metodolog[íi]a|t[ée]cnica|implementaci[óo]n|soluci[óo]n|personal|equipo|plan de trabajo|experiencia)\b/.test(
        t,
      );
    const hasCompliance =
      /\b(compliance|cumplimiento|garant[íi]a|seguro|normatividad|legal|reglamento|sunat|impuesto|seguridad)\b/.test(
        t,
      );
    const hasDelivery =
      /\b(plazo|cronograma|entrega|tiempo|calendario|hito|fecha|coordinaci[óo]n)\b/.test(
        t,
      );
    const hasCosts =
      /\b(presupuesto|costo|desglose|honorario|tarifa|precio|justificaci[óo]n de costos|valorizaci[óo]n)\b/.test(
        t,
      );

    const base =
      20 +
      (hasTechnical ? 20 : 0) +
      (hasCompliance ? 20 : 0) +
      (hasDelivery ? 15 : 0) +
      (hasCosts ? 15 : 0);
    const lengthBonus = words >= 250 ? 10 : words >= 120 ? 5 : 0;
    const score = Math.min(100, base + lengthBonus);

    const lift = (present: boolean): number =>
      present ? Math.min(100, 70 + lengthBonus) : 30;

    const criteria: ProposalCriteria = {
      technicalQuality: lift(hasTechnical),
      compliance: lift(hasCompliance),
      delivery: lift(hasDelivery),
      costJustification: lift(hasCosts),
    };

    const missing = [
      hasTechnical ? '' : 'detalle técnico',
      hasCompliance ? '' : 'respaldo de cumplimiento/garantías',
      hasDelivery ? '' : 'cronograma o plazos',
      hasCosts ? '' : 'justificación de costos',
    ].filter(Boolean);

    const summary =
      missing.length === 0
        ? 'Propuesta completa: respaldo técnico, legal, de plazos y de costos.'
        : `Evaluación heurística: faltan ${missing.join(', ')}.`;

    return { score, criteria, summary, model: 'heuristic' };
  }
}
