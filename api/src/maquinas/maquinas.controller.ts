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
import { MaquinasService } from './maquinas.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { SetPlannedProductionDto } from './dto/set-planned-production.dto';

@Controller('machines')
@Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
export class MaquinasController {
  constructor(private readonly maquinasService: MaquinasService) {}

  // Totem/TV leem sem login — ver JwtAuthGuard (fallback pra empresa padrão).
  @Get()
  listar(@CurrentUser() user: UserPayload) {
    return this.maquinasService.listarTodas(user.companyId);
  }

  @Get(':id')
  buscar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.maquinasService.buscarPorId(id, user.companyId);
  }

  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR)
  @Post()
  criar(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateMachineDto,
  ) {
    return this.maquinasService.criar(user.companyId, dto);
  }

  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR)
  @Patch(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: UpdateMachineDto,
  ) {
    return this.maquinasService.atualizar(id, user.companyId, dto);
  }

  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR)
  @Delete(':id')
  remover(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.maquinasService.remover(id, user.companyId);
  }

  /**
   * PATCH /machines/:id/planned-production
   * Só supervisor/admin definem a próxima produção — e só enquanto a
   * máquina não tem sessão ativa (validado no service).
   */
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR)
  @Patch(':id/planned-production')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR)
  definirProximaProducao(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: SetPlannedProductionDto,
  ) {
    return this.maquinasService.definirProximaProducao(id, user.companyId, dto);
  }
}
