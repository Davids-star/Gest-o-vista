import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LotesService } from './lotes.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';
import { CreateLotDto } from './dto/create-lot.dto';

@Controller('lots')
@Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

  @Get()
  listar(@CurrentUser() user: UserPayload) {
    return this.lotesService.listarTodos(user.companyId);
  }

  @Get(':id')
  buscar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.lotesService.buscarPorId(id, user.companyId);
  }

  @Post()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
  criar(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateLotDto,
  ) {
    return this.lotesService.criar(user.companyId, dto);
  }
}
