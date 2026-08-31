import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProdutosService } from './produtos.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Get()
  @Public()
  listar(@CurrentUser() user: UserPayload) {
    return this.produtosService.listarTodos(user.companyId);
  }

  @Get(':id')
  @Public()
  buscar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.produtosService.buscarPorId(id, user.companyId);
  }

  @Post()
  criar(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateProductDto,
  ) {
    return this.produtosService.criar(user.companyId, dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: UpdateProductDto,
  ) {
    return this.produtosService.atualizar(id, user.companyId, dto);
  }
}
