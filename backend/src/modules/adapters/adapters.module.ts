import { Module } from '@nestjs/common';
import { AdaptersController } from './adapters.controller';
import { AdaptersService } from './adapters.service';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [InvoicesModule],
  controllers: [AdaptersController],
  providers: [AdaptersService],
})
export class AdaptersModule {}
