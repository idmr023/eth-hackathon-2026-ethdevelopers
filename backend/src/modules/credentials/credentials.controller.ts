import { Controller, Get, Param } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { AppError, ErrorCodes } from '../../common/errors';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get('me')
  async listMe(@CurrentUser() user: AuthUser) {
    if (!user.walletAddress) {
      return [];
    }
    // Debería traer del prisma local, que sincronizamos con el on-chain
    return this.credentialsService.listForWallet(
      user.walletAddress as `0x${string}`,
    );
  }

  @Get(':uid')
  async getByUid(@Param('uid') uid: string) {
    const cred = await this.credentialsService.getCredentialByUid(uid);
    if (!cred) {
      throw new AppError(ErrorCodes.NOT_FOUND, 404, 'Credencial no encontrada');
    }
    return cred;
  }
}
