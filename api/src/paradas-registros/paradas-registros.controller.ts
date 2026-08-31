import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,

} from '@nestjs/common';
import { ParadasRegistrosService } from './paradas-registros.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../usuarios/usuario.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('paradas-registros')
export class ParadasRegistrosController {
  constructor(private readonly paradasRegistrosService: ParadasRegistrosService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  listar(@CurrentUser() user: UserPayload) {
    return this.paradasRegistrosService.listarTodos(user.companyId);
  }

  @Get('maquina/:maquinaId')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  listarPorMaquina(@Param('maquinaId', ParseUUIDPipe) maquinaId: string, @CurrentUser() user: UserPayload) {
    return this.paradasRegistrosService.listarPorMaquina(maquinaId, user.companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  buscar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.paradasRegistrosService.buscarPorId(id, user.companyId);
  }

  // Totem cria isso na "Ajuda/Parada" sem login nenhum.
  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  criar(
    @CurrentUser() user: UserPayload,
    @Body() dto: { machine_id: string; reason_id: string; observation?: string; session_id?: string },
  ) {
    return this.paradasRegistrosService.criar(user.companyId, user.id, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload, @Body() dto: any) {
    return this.paradasRegistrosService.atualizar(id, user.companyId, dto);
  }

  /**
   * PATCH /paradas-registros/:id/encerrar
   * Supervisor, admin ou operador podem encerrar uma parada e informar o motivo.
   * Totem usa isso pra "Retomar Produção" sem login nenhum.
   */
  @Patch(':id/encerrar')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  encerrar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: { motivoParadaId?: string },
  ) {
    return this.paradasRegistrosService.encerrar(id, user.companyId, dto.motivoParadaId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  remover(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.paradasRegistrosService.remover(id, user.companyId);
  }
}
