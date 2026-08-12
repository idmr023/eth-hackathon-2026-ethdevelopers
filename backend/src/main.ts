import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { allowedOrigins } from './shared/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Deshabilita ETag/304 para que las GETs nunca lleguen "Not Modified" al
  // navegador (el cliente API usa cache: no-store en el frontend).
  app.set('etag', false);

  app.setGlobalPrefix('api');

  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  const origins = allowedOrigins(config.get<string>('ALLOWED_ORIGINS'));
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Rate limiting: estricto en login/refresh, moderado en el resto.
  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(
    '/api/auth/refresh',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 60,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path.startsWith('/api/blockchain/'),
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(config.get('PORT', '4000'));
  await app.listen(port);
  logger.log(`InvoiceShield API escuchando en http://localhost:${port}/api`);
}
void bootstrap();
