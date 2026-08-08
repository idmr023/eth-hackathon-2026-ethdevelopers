import { plainToInstance, Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  validateSync,
} from 'class-validator';

export class EnvConfig {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL_UNPOOLED!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL?: string = '15m';

  @IsOptional()
  @IsString()
  JWT_REFRESH_TTL?: string = '7d';

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value as string) ?? 'http://localhost:3000')
  ALLOWED_ORIGINS?: string;

  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string = 'development';

  @IsOptional()
  @IsString()
  PORT?: string = '4000';

  @IsOptional()
  @IsString()
  SEED_ADMIN_EMAIL?: string = 'admin@invoiceshield.dev';

  @IsOptional()
  @IsString()
  SEED_ADMIN_PASSWORD?: string = 'ChangeMe123!';

  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{64}$/, {
    message: 'AGENT_ENCRYPTION_KEY debe ser 64 caracteres hex (32 bytes)',
  })
  AGENT_ENCRYPTION_KEY?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const validated = plainToInstance(EnvConfig, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const missing = errors.map((e) => e.property).join(', ');
    throw new Error(
      `Configuración inválida. Faltan o son inválidas: ${missing}`,
    );
  }
  return validated;
}

export function allowedOrigins(originsValue: string | undefined): string[] {
  return (originsValue ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
