import { Controller, Post, Patch, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { assertMaquinaDoAparelho } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';
import { StartSessionDto } from './dto/start-session.dto';
import { ChangeLotDto } from './dto/change-lot.dto';
import { ChangeOperatorDto } from './dto/change-operator.dto';
import { CloseSessionDto } from './dto/close-session.dto';

// Totem opera sem login (kiosk físico no chão de fábrica) — ver JwtAuthGuard,
// que sem token nenhum cai pro usuário-dispositivo da empresa padrão.
@Controller('totem/sessions')
@Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
export class TotemController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  iniciarSessao(
    @CurrentUser() user: UserPayload,
    @Body() dto: StartSessionDto,
  ) {
    assertMaquinaDoAparelho(user, dto.machine_id);
    return this.sessionsService.iniciarSessao(user.companyId, user.id, dto);
  }

  @Patch('current/lot')
  trocarLote(
    @CurrentUser() user: UserPayload,
    @Body() dto: ChangeLotDto,
  ) {
    assertMaquinaDoAparelho(user, dto.machine_id);
    return this.sessionsService.trocarLote(user.companyId, dto);
  }

  @Patch('current/operator')
  trocarOperador(
    @CurrentUser() user: UserPayload,
    @Body() dto: ChangeOperatorDto,
  ) {
    assertMaquinaDoAparelho(user, dto.machine_id);
    return this.sessionsService.trocarOperador(user.companyId, user.id, dto);
  }

  @Post('current/close')
  @HttpCode(HttpStatus.OK)
  encerrarSessao(
    @CurrentUser() user: UserPayload,
    @Body() dto: CloseSessionDto,
  ) {
    assertMaquinaDoAparelho(user, dto.machine_id);
    return this.sessionsService.encerrarSessao(user.companyId, dto);
  }
}
