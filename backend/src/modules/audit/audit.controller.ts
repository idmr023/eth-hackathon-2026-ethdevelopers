import { Controller, Get, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AuditRepository, AuditQueryFilters } from './audit.repository';
import { Permissions } from '../../common/decorators/rbac.decorators';
import { Permissions as PermissionKeys } from '../../common/permissions';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

class AuditListQueryDto implements AuditQueryFilters {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  tableName?: string;

  @IsOptional()
  @IsIn([
    'CREATE',
    'UPDATE',
    'DELETE',
    'REGISTER_DENIED',
    'SIGN',
    'STATUS_CHANGE',
  ])
  operation?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

@Controller('audit')
export class AuditController {
  constructor(private readonly auditRepository: AuditRepository) {}

  @Get()
  @Permissions(PermissionKeys.AUDIT_VIEW)
  async list(@Query() query: AuditListQueryDto) {
    const result = await this.auditRepository.list(query.page, query.limit, {
      tableName: query.tableName,
      operation: query.operation,
      from: query.from,
      to: query.to,
    });
    return { data: result.rows, total: result.total };
  }
}
