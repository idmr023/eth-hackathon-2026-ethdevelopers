import { IsString, Matches, IsNotEmpty, MaxLength } from 'class-validator';

// Código TOTP de 6 dígitos.
const TOTP_PATTERN = /^\d{6}$/;

export class TwoFaConfirmDto {
  @IsString()
  @Matches(TOTP_PATTERN, { message: 'El código debe tener 6 dígitos' })
  code!: string;
}

export class TwoFaVerifyLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  pendingToken!: string;

  @IsString()
  @Matches(TOTP_PATTERN, { message: 'El código debe tener 6 dígitos' })
  code!: string;
}
