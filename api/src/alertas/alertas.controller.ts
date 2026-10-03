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
import { AlertasService } from './alertas.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../usuarios/usuario.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('alertas')
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  listar(@CurrentUser() user: UserPayload) {
    return this.alertasService.listarTodos(user.companyId);
  }

  @Get('abertos')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  listarAbertos(@CurrentUser() user: UserPayload) {
    return this.alertasService.listarAbertos(user.companyId);
  }

  @Get('maquina/:maquinaId')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  listarPorMaquina(@Param('maquinaId', ParseUUIDPipe) maquinaId: string, @CurrentUser() user: UserPayload) {
    return this.alertasService.listarPorMaquina(maquinaId, user.companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  buscar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.alertasService.buscarPorId(id, user.companyId);
  }

  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  criar(@Body() dto: any) {
    return this.alertasService.criar(dto);
  }

  /** PATCH /alertas/:id/visto — admin, supervisor e operador podem marcar como visto */
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @Patch(':id/visto')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  marcarVisto(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.alertasService.marcarVisto(id, user.companyId);
  }

  /** PATCH /alertas/:id/resolvido — somente admin pode resolver */
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @Patch(':id/resolvido')
  @Roles(Role.ADMIN)
  marcarResolvido(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.alertasService.marcarResolvido(id, user.companyId);
  }

  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @Delete(':id')
  @Roles(Role.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.alertasService.remover(id, user.companyId);
  }
}
