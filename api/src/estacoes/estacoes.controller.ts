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
import { EstacoesService } from './estacoes.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../usuarios/usuario.entity';

@Controller('estacoes')
export class EstacoesController {
  constructor(private readonly estacoesService: EstacoesService) {}

  /** GET /estacoes — admin e supervisor */
  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  listar() {
    return this.estacoesService.listarTodas();
  }

  /** GET /estacoes/:id — admin e supervisor */
  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.estacoesService.buscarPorId(id);
  }

  /** POST /estacoes — somente admin */
  @Post()
  @Roles(Role.ADMIN)
  criar(@Body() dto: any) {
    return this.estacoesService.criar(dto);
  }

  /** PATCH /estacoes/:id — somente admin */
  @Patch(':id')
  @Roles(Role.ADMIN)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.estacoesService.atualizar(id, dto);
  }

  /** DELETE /estacoes/:id — somente admin */
  @Delete(':id')
  @Roles(Role.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.estacoesService.remover(id);
  }
}
