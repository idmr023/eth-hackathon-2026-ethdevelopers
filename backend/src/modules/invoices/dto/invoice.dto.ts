import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class RegisterInvoiceDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'El RUC del emisor debe tener 11 dígitos' })
  rucEmisor!: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'El RUC del receptor debe tener 11 dígitos' })
  rucReceptor!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  numero!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99_999_999_999)
  monto!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  factorId?: string;

  @IsOptional()
  @IsString()
  metadata?: string;
}

export class InvoiceListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  factorId?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
