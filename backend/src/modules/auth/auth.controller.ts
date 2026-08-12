import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  AuthService,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  LoginResult,
} from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';
import { RecoveryInitDto, RecoveryResetDto } from './dto/recovery.dto';
import { TwoFaConfirmDto, TwoFaVerifyLoginDto } from './dto/two-fa.dto';
import { AppError, ErrorCodes } from '../../common/errors';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/rbac.decorators';
import { readCookie } from '../../common/auth-request';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = (req as Request & { ip?: string }).ip ?? 'unknown';
    const result = await this.authService.login(dto.email, dto.password, ip);
    // Si 2FA está activo, el resultado es un desafío (sin cookies).
    if (!('accessToken' in result)) {
      return result;
    }
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Public()
  @Post('login/verify-2fa')
  @HttpCode(HttpStatus.OK)
  async verify2fa(
    @Body() dto: TwoFaVerifyLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verify2fa(dto.pendingToken, dto.code);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { user };
  }

  @Public()
  @Post('recovery/init')
  @HttpCode(HttpStatus.OK)
  async recoveryInit(@Body() dto: RecoveryInitDto) {
    return this.authService.recoveryInit(dto.email);
  }

  @Public()
  @Post('recovery/reset')
  @HttpCode(HttpStatus.OK)
  async recoveryReset(@Body() dto: RecoveryResetDto) {
    await this.authService.recoveryReset(dto);
    return { success: true };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = readCookie(req, REFRESH_COOKIE);
    if (!token) {
      throw new AppError(ErrorCodes.AUTH_REQUIRED, 401, 'Sesión requerida');
    }
    const result = await this.authService.refresh(token);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = readCookie(req, REFRESH_COOKIE);
    await this.authService.logout(token);
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { success: true };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true };
  }

  // ── 2FA ────────────────────────────────────────────────────────────
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  async setup2fa(@CurrentUser() user: AuthUser) {
    return this.authService.setup2fa(user.id);
  }

  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm2fa(
    @CurrentUser() user: AuthUser,
    @Body() dto: TwoFaConfirmDto,
  ) {
    await this.authService.confirm2fa(user.id, dto.code);
    return { success: true };
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  async disable2fa(
    @CurrentUser() user: AuthUser,
    @Body() dto: TwoFaConfirmDto,
  ) {
    await this.authService.disable2fa(user.id, dto.code);
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }

  private setAuthCookies(res: Response, result: LoginResult): void {
    const production =
      this.configService.get<string>('NODE_ENV') === 'production';
    // Cross-origin (frontend Vercel → API Render) requiere sameSite 'none'
    // (con Secure). En local, 'lax' mantiene el flujo de cookies HTTP.
    res.cookie(ACCESS_COOKIE, result.accessToken, {
      httpOnly: true,
      sameSite: production ? 'none' : 'lax',
      secure: production,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: production ? 'none' : 'lax',
      secure: production,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
