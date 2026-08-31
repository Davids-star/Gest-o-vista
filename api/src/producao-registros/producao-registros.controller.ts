import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,

  Query,
} from '@nestjs/common';
import { ProducaoRegistrosService } from './producao-registros.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../usuarios/usuario.entity';

@Controller('producao-registros')
export class ProducaoRegistrosController {
  constructor(private readonly producaoRegistrosService: ProducaoRegistrosService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  listar() {
    return this.producaoRegistrosService.listarTodos();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.producaoRegistrosService.buscarPorId(id);
  }

  @Get('maquina/:maquinaId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  listarPorMaquina(
    @Param('maquinaId', ParseUUIDPipe) maquinaId: string,
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ) {
    return this.producaoRegistrosService.listarPorMaquina(
      maquinaId,
      inicio ? new Date(inicio) : undefined,
      fim ? new Date(fim) : undefined,
    );
  }

  /**
   * POST /producao-registros — somente admin.
   * Idempotente: reenvios com o mesmo idLocal retornam o registro original.
   */
  @Post()
  @Roles(Role.ADMIN)
  criar(@Body() dto: any) {
    return this.producaoRegistrosService.criar(dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.producaoRegistrosService.remover(id);
  }
}
