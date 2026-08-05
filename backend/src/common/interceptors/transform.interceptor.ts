import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface ApiEnvelope<T = unknown> {
  ok: boolean;
  data: T;
  total?: number;
}

// Envuelve toda respuesta en `{ ok: true, data, total? }`.
// Si el controlador devuelve `{ data, total }`, se preserva `total`.
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiEnvelope<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload !== null &&
          typeof payload === 'object' &&
          'data' in payload
        ) {
          const { data, ...rest } = payload as Record<string, unknown> & {
            data: T;
          };
          return { ok: true, data, ...rest };
        }
        return { ok: true, data: payload };
      }),
    );
  }
}
