import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { FactorsService } from './factors.service';
import { Permissions } from '../../common/decorators/rbac.decorators';
import { Permissions as PermissionKeys } from '../../common/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { QueryFiltersDto } from '../../common/dto/pagination.dto';

class CreateFactorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'El RUC debe tener exactamente 11 dígitos' })
  ruc!: string;
}

@Controller('factors')
export class FactorsController {
  constructor(private readonly factorsService: FactorsService) {}

  @Get()
  @Permissions(PermissionKeys.INVOICES_VIEW)
  list(@Query() query: QueryFiltersDto) {
    return this.factorsService
      .list(query.page, query.limit, query.q)
      .then((r) => ({ data: r.rows, total: r.total }));
  }

  @Post()
  @Permissions(PermissionKeys.FACTORS_MANAGE)
  create(@Body() dto: CreateFactorDto, @CurrentUser() user: AuthUser) {
    return this.factorsService.create(dto.name, dto.ruc, user.id);
  }
}
