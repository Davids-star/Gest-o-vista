import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';
import { StartSessionDto } from './dto/start-session.dto';

@Controller('production-sessions')
@Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  // Leitura também precisa do OPERADOR: é o token de dispositivo do
  // Totem (role=operador) quem consulta isto pra saber se a máquina
  // selecionada já tem sessão ativa (store.fetchSessions()).
  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
  @Public()
  listar(@CurrentUser() user: UserPayload) {
    return this.sessionsService.listarTodas(user.companyId);
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
  @Public()
  buscar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.sessionsService.buscarPorId(id, user.companyId);
  }

  @Post()
  iniciar(
    @CurrentUser() user: UserPayload,
    @Body() dto: StartSessionDto,
  ) {
    return this.sessionsService.iniciarSessao(user.companyId, user.id, dto);
  }
}
