import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

// Log estructurado de cada request HTTP (método, ruta, status, duración).
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const url = req.originalUrl ?? req.url;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<Response>();
          this.logger.log(
            `${method} ${url} → ${res.statusCode} (${Date.now() - startedAt}ms)`,
          );
        },
        error: () => {
          const res = context.switchToHttp().getResponse<Response>();
          this.logger.warn(
            `${method} ${url} → ${res.statusCode} (${Date.now() - startedAt}ms)`,
          );
        },
      }),
    );
  }
}
