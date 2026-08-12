import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_PATTERN } from './change-password.dto';

// DNI peruano: 8 dígitos numéricos. Teléfono: 9 dígitos numéricos.
const DNI_PATTERN = /^\d{8}$/;
const PHONE_PATTERN = /^\d{9}$/;

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(120)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, {
    message:
      'La contraseña debe tener 8-72 caracteres, con mayúscula, minúscula y número',
  })
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'El teléfono debe tener 9 dígitos' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(DNI_PATTERN, { message: 'El DNI debe tener 8 dígitos' })
  dni?: string;

  @IsString()
  @MinLength(4)
  @MaxLength(160)
  recoveryQuestion!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recoveryAnswer!: string;
}
