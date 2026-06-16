import {
  Controller, Post, Get, Body, Patch, UseGuards,
  HttpCode, HttpStatus, Request, Response,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response as Res, Request as Req } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 8 * 60 * 60 * 1000, // 8h — matches JWT_EXPIRES_IN default
};

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  path: '/api/v1/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })   // 5 attempts / 60s per IP
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login — sets HttpOnly cookie and returns tokens' })
  async login(
    @Body() dto: LoginDto,
    @Request() req: Req,
    @Response({ passthrough: true }) res: Res,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
    const ua = req.headers['user-agent'];
    const result = await this.authService.login(dto, ip, ua);

    // Set tokens in HttpOnly cookies (SPA can also use the returned tokens)
    res.cookie('access_token', result.accessToken, COOKIE_OPTIONS);
    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return result;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — revokes token and clears cookies' })
  async logout(
    @Request() req: Req,
    @Response({ passthrough: true }) res: Res,
  ) {
    // Revoke the token (from cookie or Authorization header)
    const token =
      req.cookies?.access_token ||
      req.headers.authorization?.replace('Bearer ', '');

    if (token) await this.authService.logout(token);

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });

    return { message: 'Logged out successfully' };
  }

  @Public()
  @Throttle({ short: { limit: 10, ttl: 60000 } })  // 10 refreshes / 60s per IP
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Request() req: Req,
    @Body('refreshToken') bodyToken: string,
    @Response({ passthrough: true }) res: Res,
  ) {
    const token = req.cookies?.refresh_token || bodyToken;
    const result = await this.authService.refreshToken(token);

    res.cookie('access_token', result.accessToken, COOKIE_OPTIONS);

    return result;
  }

  @Public()
  @Throttle({ short: { limit: 3, ttl: 3600000 } }) // 3 attempts / hour per IP
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept email invitation and set password' })
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Request() req: Req,
    @Response({ passthrough: true }) res: Res,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
    const ua = req.headers['user-agent'];
    const result = await this.authService.acceptInvite(
      dto.token, dto.password, dto.firstName, dto.lastName, ip, ua,
    );
    res.cookie('access_token', result.accessToken, COOKIE_OPTIONS);
    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    return result;
  }

  @ApiBearerAuth('JWT')
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @ApiBearerAuth('JWT')
  @Patch('change-password')
  @ApiOperation({ summary: 'Change password (authenticated)' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  // ── 2FA / TOTP ────────────────────────────────────────────────

  @ApiBearerAuth('JWT')
  @Get('2fa/status')
  @ApiOperation({ summary: 'Get 2FA status for current user' })
  get2FAStatus(@CurrentUser('id') userId: string) {
    return this.authService.get2FAStatus(userId);
  }

  @ApiBearerAuth('JWT')
  @Post('2fa/setup')
  @ApiOperation({ summary: 'Generate TOTP secret and QR code (step 1 of setup)' })
  setup2FA(@CurrentUser('id') userId: string) {
    return this.authService.setup2FA(userId);
  }

  @ApiBearerAuth('JWT')
  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify TOTP token and activate 2FA (step 2 of setup)' })
  verify2FA(
    @CurrentUser('id') userId: string,
    @Body() body: { token: string },
  ) {
    return this.authService.verify2FA(userId, body.token);
  }

  @ApiBearerAuth('JWT')
  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disable 2FA (requires valid TOTP token)' })
  disable2FA(
    @CurrentUser('id') userId: string,
    @Body() body: { token: string },
  ) {
    return this.authService.disable2FA(userId, body.token);
  }

  @ApiBearerAuth('JWT')
  @Throttle({ short: { limit: 5, ttl: 300000 } })  // 5 attempts / 5 min
  @Post('2fa/validate')
  @ApiOperation({ summary: 'Validate TOTP during login (called separately after password auth)' })
  @HttpCode(HttpStatus.OK)
  async validate2FA(
    @CurrentUser('id') userId: string,
    @Body() body: { token: string },
  ) {
    const valid = await this.authService.validate2FA(userId, body.token);
    if (!valid) throw new Error('Código 2FA inválido');
    return { valid: true };
  }
}
