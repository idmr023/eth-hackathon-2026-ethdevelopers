import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { PASSWORD_PATTERN } from './change-password.dto';

export class RecoveryInitDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(120)
  email!: string;
}

export class RecoveryResetDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(120)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  answer!: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, {
    message:
      'La contraseña debe tener 8-72 caracteres, con mayúscula, minúscula y número',
  })
  newPassword!: string;
}
