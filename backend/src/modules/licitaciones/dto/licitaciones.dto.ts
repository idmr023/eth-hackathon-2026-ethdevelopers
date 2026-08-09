import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateLicitacionDto {
  @ApiProperty({ example: 'Suministro de materiales de oficina Q4' })
  @IsString()
  @Length(4, 255)
  title!: string;

  @ApiProperty({ example: 'Papelería y suministros' })
  @IsString()
  @Length(1, 100)
  category!: string;

  @ApiProperty({ example: 8500000 })
  @IsInt()
  @Min(1)
  budget!: number;

  @ApiProperty({ example: '2026-08-20T10:00' })
  @IsString()
  @Length(1, 40)
  commitEnd!: string;

  @ApiProperty({ example: '2026-08-21T10:00' })
  @IsString()
  @Length(1, 40)
  revealEnd!: string;

  @ApiPropertyOptional({ example: 'Suministro trimestral de papelería.' })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;
}

export class JoinLicitacionDto {
  @ApiProperty({ example: 'LIC-2024-001' })
  @IsString()
  @Length(1, 64)
  licitacionId!: string;

  @ApiProperty({ example: 'Proveedor H' })
  @IsString()
  @Length(1, 120)
  bidderName!: string;

  @ApiProperty({ example: 1200000 })
  @IsInt()
  @Min(1)
  amount!: number;
}
