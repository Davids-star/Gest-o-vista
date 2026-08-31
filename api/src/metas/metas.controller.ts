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
import { MetasService } from './metas.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../usuarios/usuario.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('metas')
export class MetasController {
  constructor(private readonly metasService: MetasService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  listar(@CurrentUser() user: UserPayload) {
    return this.metasService.listarTodas(user.companyId);
  }

  @Get('maquina/:maquinaId')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  listarPorMaquina(
    @Param('maquinaId', ParseUUIDPipe) maquinaId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.metasService.listarPorMaquina(maquinaId, user.companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.OPERADOR)
  @Public()
  buscar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.metasService.buscarPorId(id, user.companyId);
  }

  @Post()
  @Roles(Role.SUPERVISOR)
  criar(@CurrentUser() user: UserPayload, @Body() dto: any) {
    return this.metasService.criar(user.companyId, user.id, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPERVISOR)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload, @Body() dto: any) {
    return this.metasService.atualizar(id, user.companyId, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERVISOR)
  remover(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.metasService.remover(id, user.companyId);
  }
}
