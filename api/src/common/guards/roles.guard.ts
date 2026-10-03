import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '../../usuarios/usuario.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const { user, method } = request;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Escrita (POST/PATCH/PUT/DELETE) sem papel declarado é NEGADA por padrão:
    // um endpoint novo que esqueça @Roles não fica aberto para qualquer token.
    if (!requiredRoles || requiredRoles.length === 0) {
      if (method && method !== 'GET') {
        throw new ForbiddenException('Acesso negado: escrita sem papel definido');
      }
      return true;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException('Acesso negado: permissão insuficiente');
    }
    return true;
  }
}
