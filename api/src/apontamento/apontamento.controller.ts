import { Controller, Get, Query } from '@nestjs/common';
import { ApontamentoService, formatarDataLocal } from './apontamento.service';
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

  /**
   * GET /apontamento/mensal?year=&month=&shift_id=&machine_id=&product_id=&lot_id=
   * `year`/`month` obrigatórios. Resumo agregado do mês inteiro — produção,
   * tempo produzido/parado, paradas — com quebras por dia, máquina, turno e
   * motivo de parada, prontas pro Resumo Mensal do Dashboard (ver
   * ApontamentoService.obterMensal pra semântica de cada campo).
   */
  @Get('mensal')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
  @Public()
  obterMensal(
    @CurrentUser() user: UserPayload,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('shift_id') shift_id?: string,
    @Query('machine_id') machine_id?: string,
    @Query('product_id') product_id?: string,
    @Query('lot_id') lot_id?: string,
  ) {
    // Sem year/month → mês atual (horário de fábrica), mesma convenção do
    // GET /apontamento sem `date`.
    const [anoAtual, mesAtual] = formatarDataLocal(new Date()).split('-');
    const anoNum = Number(year) || Number(anoAtual);
    const mesNum = Number(month) || Number(mesAtual);
    return this.apontamentoService.obterMensal(user.companyId, {
      year: anoNum,
      month: mesNum,
      shift_id,
      machine_id,
      product_id,
      lot_id,
    });
  }
}
