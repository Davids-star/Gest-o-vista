import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuario.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from './usuario.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

/** O hash da senha nunca sai da API (antes GET /usuarios devolvia password_hash de todo mundo). */
const semHash = <T extends { password_hash?: unknown }>(u: T) => {
  const { password_hash: _ignorado, ...resto } = u;
  return resto;
};

@Controller('usuarios')
@UseGuards(RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  async listar(@CurrentUser() user: UserPayload) {
    return (await this.usuariosService.listarTodos(user.companyId)).map(semHash);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  async buscar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return semHash(await this.usuariosService.buscarPorId(id, user.companyId));
  }

  @Post()
  @Roles(Role.ADMIN)
  async criar(@CurrentUser() user: UserPayload, @Body() dto: CreateUsuarioDto) {
    return semHash(await this.usuariosService.criar(user.companyId, dto));
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async atualizar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload, @Body() dto: UpdateUsuarioDto) {
    return semHash(await this.usuariosService.atualizar(id, user.companyId, dto));
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.usuariosService.remover(id, user.companyId, user.id);
  }
}
