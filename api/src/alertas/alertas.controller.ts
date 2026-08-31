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
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../usuarios/usuario.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('alertas')
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  listar(@CurrentUser() user: UserPayload) {
    return this.alertasService.listarTodos(user.companyId);
  }

  @Get('abertos')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  listarAbertos(@CurrentUser() user: UserPayload) {
    return this.alertasService.listarAbertos(user.companyId);
  }

  @Get('maquina/:maquinaId')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  listarPorMaquina(@Param('maquinaId', ParseUUIDPipe) maquinaId: string, @CurrentUser() user: UserPayload) {
    return this.alertasService.listarPorMaquina(maquinaId, user.companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  buscar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.alertasService.buscarPorId(id, user.companyId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  criar(@Body() dto: any) {
    return this.alertasService.criar(dto);
  }

  /** PATCH /alertas/:id/visto — admin, supervisor e operador podem marcar como visto */
  @Patch(':id/visto')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  marcarVisto(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.alertasService.marcarVisto(id, user.companyId);
  }

  /** PATCH /alertas/:id/resolvido — somente admin pode resolver */
  @Patch(':id/resolvido')
  @Roles(Role.ADMIN)
  marcarResolvido(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.alertasService.marcarResolvido(id, user.companyId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.alertasService.remover(id, user.companyId);
  }
}
