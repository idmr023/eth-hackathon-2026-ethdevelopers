import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
}

// Circuit breaker para integraciones externas (adaptadores SUNAT/CAVALI).
// Estados: closed → open → half-open. Evita saturar servicios degradados.
@Injectable()
export class ResilienceService {
  private readonly logger = new Logger('ResilienceService');

  async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const attempts = Math.max(1, options.attempts ?? 3);
    const baseDelayMs = options.baseDelayMs ?? 200;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          const delay = baseDelayMs * attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  createBreaker(name: string, options: CircuitBreakerOptions = {}) {
    const logger = this.logger;
    const failureThreshold = options.failureThreshold ?? 3;
    const resetTimeoutMs = options.resetTimeoutMs ?? 10_000;
    let failures = 0;
    let open = false;
    let openedAt = 0;

    return {
      async call<T>(fn: () => Promise<T>): Promise<T> {
        if (open) {
          if (Date.now() - openedAt >= resetTimeoutMs) {
            open = false;
            failures = 0;
          } else {
            logger.warn(
              `Circuit breaker [${name}] abierto. Request bloqueado.`,
            );
            throw new Error(
              `Servicio externo [${name}] no disponible temporalmente`,
            );
          }
        }
        try {
          const result = await fn();
          failures = 0;
          return result;
        } catch (error) {
          failures += 1;
          if (failures >= failureThreshold) {
            open = true;
            openedAt = Date.now();
            logger.warn(
              `Circuit breaker [${name}] abierto tras ${failures} fallos consecutivos.`,
            );
          }
          throw error;
        }
      },
    };
  }
}
