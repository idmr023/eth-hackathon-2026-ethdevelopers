// Catálogo central de códigos de error de la API. Cada error de dominio usa
// uno de estos códigos; el frontend los traduce para mostrar mensajes.

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  MUST_CHANGE_PASSWORD: 'MUST_CHANGE_PASSWORD',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  FRAUD_DETECTED: 'FRAUD_DETECTED',
  INVOICE_ALREADY_VALIDATED: 'INVOICE_ALREADY_VALIDATED',
  INVOICE_BLOCKED: 'INVOICE_BLOCKED',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(ErrorCodes.VALIDATION_ERROR, 400, message, details);

export const unauthorized = (
  message = 'Autenticación requerida',
  code: ErrorCode = ErrorCodes.AUTH_REQUIRED,
) => new AppError(code, 401, message);

export const forbidden = (message = 'No tienes permisos para esta acción') =>
  new AppError(ErrorCodes.FORBIDDEN, 403, message);

export const notFound = (message = 'Recurso no encontrado') =>
  new AppError(ErrorCodes.NOT_FOUND, 404, message);

export const conflict = (
  message = 'Conflicto con el estado actual del recurso',
) => new AppError(ErrorCodes.CONFLICT, 409, message);
