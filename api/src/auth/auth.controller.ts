import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/login — público */
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /** GET /auth/me — privado (requer JwtAuthGuard) */
  @Get('me')
  me(@CurrentUser() user: UserPayload) {
    return this.authService.me(user.id);
  }

  /**
   * POST /auth/device-token — só ADMINISTRADOR.
   * Gera um token de vida longa pra configurar uma vez no Totem/TV físico
   * (ver frontend: ativação por ?device_token=... na URL).
   */
  @Post('device-token')
  @Roles(UserRole.ADMINISTRADOR)
  gerarTokenDispositivo(@CurrentUser() user: UserPayload) {
    return this.authService.gerarTokenDispositivo(user.companyId);
  }
}
