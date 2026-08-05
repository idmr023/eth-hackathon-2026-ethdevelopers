import { Module } from '@nestjs/common';
import { AnomaliesController } from './anomalies.controller';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [InvoicesModule],
  controllers: [AnomaliesController],
})
export class AnomaliesModule {}
