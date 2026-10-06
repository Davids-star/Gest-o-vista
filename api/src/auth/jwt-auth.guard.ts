import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { modoLocalSemToken } from './modo-local';
import { DevicesService } from '../devices/devices.service';

/**
 * Todas as rotas exigem token válido (usuário logado ou token de dispositivo),
 * exceto as marcadas com @Public() — hoje só POST /auth/login e a rota raiz.
 * Não existe mais acesso anônimo: sem token, a resposta é 401.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly authService: AuthService,
    private readonly devicesService: DevicesService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Token por dispositivo (tablet/celular): X-Device-Id + X-Device-Token.
    // Revogado (active = false) ou inválido → 401, mesmo em modo local.
    const deviceId = request.headers?.['x-device-id'];
    const deviceToken = request.headers?.['x-device-token'];
    if (!request.headers?.authorization && deviceId && deviceToken) {
      const dispositivo = await this.devicesService.validarDeviceToken(String(deviceId), String(deviceToken));
      if (!dispositivo) throw new UnauthorizedException('Dispositivo inválido ou revogado');
      request.user = {
        id: dispositivo.id,
        companyId: dispositivo.machine.company_id,
        role: 'operador',
        email: dispositivo.identifier,
      };
      return true;
    }

    // Modo local (só em desenvolvimento, ver modo-local.ts): sem token, entra como operador local.
    if (!request.headers?.authorization && modoLocalSemToken()) {
      const contexto = await this.authService.obterContextoLocal();
      if (contexto) {
        request.user = contexto;
        return true;
      }
    }
    return super.canActivate(context) as Promise<boolean>;
  }
}
