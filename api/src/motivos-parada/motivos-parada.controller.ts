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
import { MotivosParadaService } from './motivos-parada.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../usuarios/usuario.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('motivos-parada')
export class MotivosParadaController {
  constructor(private readonly motivosParadaService: MotivosParadaService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  listar(@CurrentUser() user: UserPayload) {
    return this.motivosParadaService.listarTodos(user.companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  buscar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.motivosParadaService.buscarPorId(id, user.companyId);
  }

  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @Post()
  @Roles(Role.ADMIN)
  criar(@CurrentUser() user: UserPayload, @Body() dto: any) {
    return this.motivosParadaService.criar(user.companyId, dto);
  }

  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @Patch(':id')
  @Roles(Role.ADMIN)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload, @Body() dto: any) {
    return this.motivosParadaService.atualizar(id, user.companyId, dto);
  }

  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @Delete(':id')
  @Roles(Role.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.motivosParadaService.remover(id, user.companyId);
  }
}
