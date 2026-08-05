import type { Request } from 'express';
import type { AuthUser } from './decorators/current-user.decorator';

// Redeclaramos `cookies` y `user` explícitamente para no depender del merge
// de @types/cookie-parser (que tipa cookies como Record<string, any>).
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  cookies: Record<string, string>;
}

// Acceso a cookies independiente de los tipos contaminados de express.
export function readCookie(req: unknown, name: string): string | undefined {
  return (req as { cookies?: Record<string, string> }).cookies?.[name];
}
