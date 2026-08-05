import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { InvoicesRepository } from '../invoices/invoices.repository';
import { AuditRepository } from '../audit/audit.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [DashboardController],
  providers: [DashboardService, InvoicesRepository, AuditRepository],
})
export class DashboardModule {}
