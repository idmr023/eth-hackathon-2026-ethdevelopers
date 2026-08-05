import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Permissions } from '../../common/decorators/rbac.decorators';
import { Permissions as PermissionKeys } from '../../common/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Permissions(PermissionKeys.INVOICES_VIEW)
  overview(@CurrentUser() user: AuthUser) {
    const permissions = new Set(user.permissions);
    return this.dashboardService.overview({
      includeAudit: permissions.has(PermissionKeys.AUDIT_VIEW),
      includeUsers: permissions.has(PermissionKeys.USERS_MANAGE),
    });
  }
}
