import { Controller, Get } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';

// Só leitura por enquanto — turnos são cadastro fixo de fábrica (3 turnos
// padrão, seedados via migration). CRUD completo fica pra quando precisar.
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRADOR, UserRole.OPERADOR)
  @Public()
  listar(@CurrentUser() user: UserPayload) {
    return this.shiftsService.listarTodos(user.companyId);
  }
}
