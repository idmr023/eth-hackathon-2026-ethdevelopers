import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { LicitacionesController } from './licitaciones.controller';
import { LicitacionesService } from './licitaciones.service';

@Module({
  imports: [SharedModule],
  controllers: [LicitacionesController],
  providers: [LicitacionesService],
  exports: [LicitacionesService],
})
export class LicitacionesModule {}
