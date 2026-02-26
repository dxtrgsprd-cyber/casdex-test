import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RefreshTokenDto,
  SetPasswordDto,
  ResetPasswordRequestDto,
  ResetPasswordDto,
  ChangePasswordDto,
  SwitchTenantDto,
} from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto.email, dto.password, dto.tenantId);
    return { success: true, data: result };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(dto.refreshToken);
    return { success: true, data: tokens };
  }

  @Public()
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(@Body() dto: SetPasswordDto) {
    await this.authService.setPassword(dto.token, dto.password);
    return { success: true, message: 'Password set successfully' };
  }

  @Public()
  @Post('reset-password/request')
  @HttpCode(HttpStatus.OK)
  async requestReset(@Body() dto: ResetPasswordRequestDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { success: true, message: 'If an account exists, a reset link has been sent' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.setPassword(dto.token, dto.password);
    return { success: true, message: 'Password reset successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
    return { success: true, message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-tenant')
  @HttpCode(HttpStatus.OK)
  async switchTenant(
    @CurrentUser() user: RequestUser,
    @Body() dto: SwitchTenantDto,
  ) {
    const result = await this.authService.switchTenant(user.userId, dto.tenantId);
    return { success: true, data: result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: RequestUser) {
    await this.authService.logout(user.userId);
    return { success: true, message: 'Logged out successfully' };
  }
}
