import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @Roles(UserRole.ADMINISTRADOR, UserRole.SUPERVISOR)
  async criar(@Req() req: any, @Body() dto: CreateDeviceDto) {
    return this.devicesService.criarDevice(req.user.companyId, dto);
  }

  @Get()
  @Roles(UserRole.ADMINISTRADOR, UserRole.SUPERVISOR, UserRole.OPERADOR)
  async listar(@Req() req: any) {
    return this.devicesService.listarDevices(req.user.companyId);
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRADOR, UserRole.SUPERVISOR, UserRole.OPERADOR)
  async obter(@Req() req: any, @Param('id') id: string) {
    return this.devicesService.obterDevice(req.user.companyId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR, UserRole.SUPERVISOR)
  async atualizar(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.devicesService.atualizarDevice(req.user.companyId, id, dto);
  }

  @Post(':id/rotate-token')
  @Roles(UserRole.ADMINISTRADOR, UserRole.SUPERVISOR)
  async rotacionarToken(@Req() req: any, @Param('id') id: string) {
    return this.devicesService.rotacionarToken(req.user.companyId, id);
  }
}
