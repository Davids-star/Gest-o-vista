import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly authService: AuthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPublic) {
      return super.canActivate(context) as Promise<boolean>;
    }

    // Rota pública (Totem/TV): se vier um token válido (ex.: um supervisor
    // logado abrindo essa mesma tela em outra aba), usa a identidade real.
    // Sem token nenhum — o caso normal de um kiosk sem login — cai pra um
    // usuário-dispositivo da empresa padrão, assim os controllers (que
    // sempre esperam @CurrentUser()) continuam funcionando sem mudança
    // nenhuma neles. RolesGuard continua rodando depois e barra qualquer
    // ação que esse papel (operador) não pode fazer.
    const request = context.switchToHttp().getRequest();
    if (request.headers?.authorization) {
      try {
        if (await (super.canActivate(context) as Promise<boolean>)) return true;
      } catch {
        // token presente mas inválido/expirado — segue pro fallback público
      }
    }

    const contexto = await this.authService.obterContextoPublico();
    if (contexto) request.user = contexto;
    return true;
  }
}
