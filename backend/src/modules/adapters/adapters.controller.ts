import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { AdaptersService } from './adapters.service';
import { Permissions } from '../../common/decorators/rbac.decorators';
import { Permissions as PermissionKeys } from '../../common/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

class SignInvoiceDto {
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;
}

@Controller('adapters')
export class AdaptersController {
  constructor(private readonly adaptersService: AdaptersService) {}

  @Post('sunat/conformity')
  @Permissions(PermissionKeys.ADAPTERS_SIGN)
  signSunat(@Body() dto: SignInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.adaptersService.signByAdapter(
      dto.invoiceId,
      'simulated-sunat',
      user,
    );
  }

  @Post('cavali/factrack')
  @Permissions(PermissionKeys.ADAPTERS_SIGN)
  signCavali(@Body() dto: SignInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.adaptersService.signByAdapter(
      dto.invoiceId,
      'simulated-cavali',
      user,
    );
  }

  @Get('status')
  @Permissions(PermissionKeys.INVOICES_VIEW)
  status() {
    return { adapters: this.adaptersService.portalStatus() };
  }
}
