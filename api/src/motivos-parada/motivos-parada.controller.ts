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
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../usuarios/usuario.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('motivos-parada')
export class MotivosParadaController {
  constructor(private readonly motivosParadaService: MotivosParadaService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  listar(@CurrentUser() user: UserPayload) {
    return this.motivosParadaService.listarTodos(user.companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  buscar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.motivosParadaService.buscarPorId(id, user.companyId);
  }

  @Post()
  @Roles(Role.ADMIN)
  criar(@CurrentUser() user: UserPayload, @Body() dto: any) {
    return this.motivosParadaService.criar(user.companyId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload, @Body() dto: any) {
    return this.motivosParadaService.atualizar(id, user.companyId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.motivosParadaService.remover(id, user.companyId);
  }
}
