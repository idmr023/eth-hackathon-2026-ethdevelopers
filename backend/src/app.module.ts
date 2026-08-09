import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { AppController } from './app.controller';
import { SharedModule } from './shared/shared.module';
import { validateEnv } from './shared/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FactorsModule } from './modules/factors/factors.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { AdaptersModule } from './modules/adapters/adapters.module';
import { AnomaliesModule } from './modules/anomalies/anomalies.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { BiddingModule } from './modules/bidding/bidding.module';
import { LicitacionesModule } from './modules/licitaciones/licitaciones.module';
import { AuthGuard } from './common/guards/auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_ACCESS_TTL',
            '15m',
          ) as StringValue,
        },
      }),
    }),
    SharedModule,
    AuthModule,
    UsersModule,
    FactorsModule,
    InvoicesModule,
    AdaptersModule,
    AnomaliesModule,
    DashboardModule,
    AuditModule,
    HealthModule,
    BlockchainModule,
    BiddingModule,
    LicitacionesModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
