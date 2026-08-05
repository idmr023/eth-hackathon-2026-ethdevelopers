import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { RegisterInvoiceDto, InvoiceListQueryDto } from './dto/invoice.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Permissions } from '../../common/decorators/rbac.decorators';
import { Permissions as PermissionKeys } from '../../common/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('register')
  @Permissions(PermissionKeys.INVOICES_REGISTER)
  register(@Body() dto: RegisterInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoicesService.registerInvoice(
      {
        rucEmisor: dto.rucEmisor,
        rucReceptor: dto.rucReceptor,
        numero: dto.numero,
        monto: dto.monto,
        currency: dto.currency,
        factorId: dto.factorId,
        metadata: dto.metadata,
      },
      user,
    );
  }

  @Get()
  @Permissions(PermissionKeys.INVOICES_VIEW)
  async list(@Query() query: InvoiceListQueryDto) {
    const result = await this.invoicesService.list(query.page, query.limit, {
      status: query.status,
      factorId: query.factorId,
      q: query.q,
    });
    return { data: result.rows, total: result.total };
  }

  @Get('fraud-alerts')
  @Permissions(PermissionKeys.INVOICES_VIEW)
  async listFraudAlerts(@Query() query: PaginationDto) {
    const result = await this.invoicesService.listFraudAlerts(
      query.page,
      query.limit,
    );
    return { data: result.rows, total: result.total };
  }

  @Get(':id')
  @Permissions(PermissionKeys.INVOICES_VIEW)
  detail(@Param('id') id: string) {
    return this.invoicesService.detail(id);
  }
}
