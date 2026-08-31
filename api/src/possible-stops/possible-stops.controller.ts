import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { PossibleStopsService } from './possible-stops.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';
import { PossibleStopStatus } from '../database/entities/possible-stop.entity';

@Controller('possible-stops')
@Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
@Public()
export class PossibleStopsController {
  constructor(private readonly possibleStopsService: PossibleStopsService) {}

  @Get()
  listar(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: PossibleStopStatus,
    @Query('machine_id') machineId?: string,
  ) {
    return this.possibleStopsService.listar(user.companyId, status, machineId);
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.possibleStopsService.buscarPorId(id, user.companyId);
  }

  @Patch(':id/confirmar')
  confirmar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: { reason_id: string; observation?: string },
  ) {
    return this.possibleStopsService.confirmar(id, user.companyId, user.id, dto);
  }

  @Patch(':id/descartar')
  descartar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.possibleStopsService.descartar(id, user.companyId);
  }
}
