import { Controller, Get, Query } from '@nestjs/common';
import { ApontamentoService } from './apontamento.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';

@Controller('apontamento')
export class ApontamentoController {
  constructor(private readonly apontamentoService: ApontamentoService) {}

  /**
   * GET /apontamento?date=YYYY-MM-DD&shift_id=&machine_id=&product_id=&lot_id=
   * Tudo opcional — sem `date`, assume o dia de hoje (horário de fábrica).
   * Resposta já vem pronta pra tela (resumo, sessões, paradas, tempo
   * parado por motivo) — ver ApontamentoService pra semântica de cada campo.
   */
  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
  @Public()
  obter(
    @CurrentUser() user: UserPayload,
    @Query('date') date?: string,
    @Query('shift_id') shift_id?: string,
    @Query('machine_id') machine_id?: string,
    @Query('product_id') product_id?: string,
    @Query('lot_id') lot_id?: string,
  ) {
    return this.apontamentoService.obter(user.companyId, { date, shift_id, machine_id, product_id, lot_id });
  }
}
