import { Module } from '@nestjs/common';
import { FactorsController } from './factors.controller';
import { FactorsService } from './factors.service';
import { FactorsRepository } from './factors.repository';

@Module({
  controllers: [FactorsController],
  providers: [FactorsService, FactorsRepository],
  exports: [FactorsService, FactorsRepository],
})
export class FactorsModule {}
