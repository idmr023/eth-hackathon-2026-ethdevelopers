import { IsString, Matches, MinLength } from 'class-validator';

// Password: 8-72 chars, al menos una mayúscula, una minúscula y un dígito.
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, {
    message:
      'La nueva contraseña debe tener 8-72 caracteres, con mayúscula, minúscula y número',
  })
  newPassword!: string;
}

export function isValidPassword(value: string): boolean {
  return PASSWORD_PATTERN.test(value);
}
