import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { AppError, ErrorCodes, ErrorCode } from '../errors';

interface ErrorBody {
  ok: false;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

// Traduce cualquier excepción a la envoltura `{ ok: false, code, message, details }`.
// Los errores >= 500 nunca exponen detalles internos.
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body: ErrorBody = {
      ok: false,
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error',
    };
    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof AppError) {
      status = exception.statusCode;
      body.code = exception.code;
      body.message = exception.message;
      if (exception.details !== undefined) body.details = exception.details;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = this.mapPrismaError(exception, body);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      body.code = ErrorCodes.VALIDATION_ERROR;
      body.message = 'Consulta inválida contra la base de datos';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionBody = exception.getResponse();
      if (typeof exceptionBody === 'string') {
        body.message = exceptionBody;
      } else if (exceptionBody && typeof exceptionBody === 'object') {
        const payload = exceptionBody as Record<string, unknown>;
        body.message = (payload.message as string) ?? exception.message;
        const messages = payload.message;
        if (Array.isArray(messages)) {
          body.details = messages;
          body.code = ErrorCodes.VALIDATION_ERROR;
        }
      }
      if (status >= 500) {
        body.code = ErrorCodes.INTERNAL_ERROR;
        body.message = 'Internal server error';
      }
    } else if (exception instanceof Error) {
      body.message = 'Internal server error';
      this.logger.error(
        `[${request.method} ${request.originalUrl ?? request.url}] ${exception.stack ?? exception.message}`,
      );
    } else {
      this.logger.error(
        `[${request.method} ${request.originalUrl ?? request.url}] ${String(exception)}`,
      );
    }

    if (status >= 500 && !(exception instanceof AppError)) {
      this.logger.error(
        `[${request.method} ${request.originalUrl ?? request.url}] ${exception instanceof Error ? exception.stack : String(exception)}`,
      );
    }

    response.status(status).json(body);
  }

  private mapPrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    body: ErrorBody,
  ): number {
    switch (exception.code) {
      case 'P2002':
        body.code = ErrorCodes.CONFLICT;
        body.message = 'Ya existe un registro con ese valor único';
        return HttpStatus.CONFLICT;
      case 'P2025':
        body.code = ErrorCodes.NOT_FOUND;
        body.message = 'Recurso no encontrado';
        return HttpStatus.NOT_FOUND;
      case 'P2003':
        body.code = ErrorCodes.VALIDATION_ERROR;
        body.message = 'Referencia inválida a un recurso relacionado';
        return HttpStatus.BAD_REQUEST;
      default:
        this.logger.error(
          `Prisma error ${exception.code}: ${exception.message}`,
        );
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}
