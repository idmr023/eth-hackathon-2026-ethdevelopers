import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';
import { CryptoService } from './crypto.service';
import { ResilienceService } from './resilience.service';

// Dependencias transversales compartidas como singletons.
@Global()
@Module({
  providers: [PrismaService, AuditService, CryptoService, ResilienceService],
  exports: [PrismaService, AuditService, CryptoService, ResilienceService],
})
export class SharedModule {}
