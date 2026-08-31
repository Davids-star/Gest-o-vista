import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'chave-secreta-dev'),
    });
  }

  /**
   * O retorno deste método é injetado em request.user automaticamente.
   * O RolesGuard lê request.user.role para decidir se o acesso é permitido.
   */
  validate(payload: { sub: string; companyId: string; role: string; email?: string }) {
    return { id: payload.sub, companyId: payload.companyId, role: payload.role, email: payload.email };
  }
}
