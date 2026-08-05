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
    this.setAuthCookies(res, result);
    return { user: result.user };
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
