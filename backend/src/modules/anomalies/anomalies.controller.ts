import { Body, Controller, Post } from '@nestjs/common';
import { AnomalyType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { InvoicesService } from '../invoices/invoices.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/rbac.decorators';
import { Permissions as PermissionKeys } from '../../common/permissions';

class CreateAnomalyDto {
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  @IsEnum(AnomalyType)
  type!: AnomalyType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;
}

@Controller('anomalies')
export class AnomaliesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // Trigger de la demo: Nota de Crédito SUNAT emitida posteriormente,
  // o disconformidad del comprador → bloquea cualquier desembolso futuro.
  @Post()
  @Permissions(PermissionKeys.ADAPTERS_SIGN)
  create(@Body() dto: CreateAnomalyDto, @CurrentUser() user: AuthUser) {
    return this.invoicesService.applyAnomaly(
      dto.invoiceId,
      dto.type,
      dto.detail ?? '',
      user,
    );
  }
}
