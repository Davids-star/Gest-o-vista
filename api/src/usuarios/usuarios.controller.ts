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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from './usuario.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('usuarios')
@UseGuards(RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  listar(@CurrentUser() user: UserPayload) {
    return this.usuariosService.listarTodos(user.companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  buscar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.usuariosService.buscarPorId(id, user.companyId);
  }

  @Post()
  @Roles(Role.ADMIN)
  criar(@CurrentUser() user: UserPayload, @Body() dto: { nome: string; email: string; senha: string; role: Role }) {
    return this.usuariosService.criar(user.companyId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload, @Body() dto: any) {
    return this.usuariosService.atualizar(id, user.companyId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.usuariosService.remover(id, user.companyId);
  }
}
