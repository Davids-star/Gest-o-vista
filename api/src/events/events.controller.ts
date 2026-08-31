import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';

@Controller('production-events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /production-events/totals?session_id=X — soma real via SQL (sem
   * paginação). Isso é o que qualquer tela deve usar pra mostrar "unidades
   * produzidas"; a listagem paginada abaixo é só pra histórico/depuração.
   */
  @Get('totals')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
  @Public()
  totais(@CurrentUser() user: UserPayload, @Query('session_id') sessionId?: string) {
    return this.eventsService.totaisPorSessao(user.companyId, sessionId);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
  @Public()
  listar(
    @CurrentUser() user: UserPayload,
    @Query() query: QueryEventsDto,
  ) {
    return this.eventsService.listarEventos(user.companyId, query);
  }

  @Post()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
  criar(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.criarEvento(user.companyId, dto);
  }
}
