import { Injectable } from '@nestjs/common';
import { InvoicesRepository } from '../invoices/invoices.repository';
import { AuditRepository } from '../audit/audit.repository';
import { UsersService } from '../users/users.service';

export interface DashboardScope {
  includeAudit: boolean;
  includeUsers: boolean;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly auditRepository: AuditRepository,
    private readonly usersService: UsersService,
  ) {}

  async overview(
    scope: DashboardScope = { includeAudit: false, includeUsers: false },
  ) {
    const tasks = [
      this.invoicesRepository.counts(),
      this.invoicesRepository.listRecent(6),
      this.invoicesRepository.listFraudAlerts(6),
    ] as const;

    const [counts, recentInvoices, recentFraudAlerts] =
      await Promise.all(tasks);

    const [recentAudit, recentUsers] = await Promise.all([
      scope.includeAudit
        ? this.auditRepository.list(1, 6)
        : Promise.resolve({ rows: [] }),
      scope.includeUsers
        ? this.usersService.list(1, 6)
        : Promise.resolve({ rows: [] }),
    ]);

    return {
      counts,
      recentInvoices,
      recentFraudAlerts,
      recentAudit: recentAudit.rows,
      recentUsers: recentUsers.rows,
      updatedAt: new Date().toISOString(),
    };
  }
}
