import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth-request';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
  totpEnabled: boolean;
  factorId: string | null;
  walletAddress?: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
