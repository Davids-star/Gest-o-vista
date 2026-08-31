import {
  Controller,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,

} from '@nestjs/common';
import { ApontamentosHoraService } from './apontamentos-hora.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../usuarios/usuario.entity';

/**
 * Apontamentos são gerados/atualizados AUTOMATICAMENTE pelo sistema.
 * Este controller expõe apenas leitura (GET) e remoção (DELETE, somente admin).
 * Não há rotas POST/PATCH manuais.
 */
@Controller('apontamentos-hora')
export class ApontamentosHoraController {
  constructor(private readonly apontamentosHoraService: ApontamentosHoraService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  listar() {
    return this.apontamentosHoraService.listarTodos();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.apontamentosHoraService.buscarPorId(id);
  }

  @Get('maquina/:maquinaId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  listarPorMaquina(@Param('maquinaId', ParseUUIDPipe) maquinaId: string) {
    return this.apontamentosHoraService.listarPorMaquina(maquinaId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.apontamentosHoraService.remover(id);
  }
}
