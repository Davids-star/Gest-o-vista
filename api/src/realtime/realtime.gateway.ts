import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { corsOrigins } from '../common/config/cors.config';
import { AuthService } from '../auth/auth.service';
import { modoLocalSemToken } from '../auth/modo-local';
import { DevicesService } from '../devices/devices.service';

/**
 * Canal de tempo real do sistema GP.
 *
 * REGRA DE MULTIEMPRESA: cada socket só entra na room da empresa presente
 * no JWT (nunca em um company_id enviado pelo cliente). Eventos emitidos
 * por esta gateway nunca vazam entre empresas.
 *
 * Eventos emitidos (ver *Service que injeta RealtimeGateway):
 *   machine.state.changed, production.updated,
 *   alert.created, alert.resolved,
 *   stop.started, stop.ended,
 *   session.started, session.closed, session.updated,
 *   target.updated
 *
 * O payload de cada evento é enxuto (ids), de propósito: o cliente reage
 * refazendo o fetch real via REST (mesma função usada pelo polling), em vez
 * de duplicar lógica de merge de estado em dois lugares.
 */
@WebSocketGateway({
  cors: {
    origin: corsOrigins(),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * Sem token válido a conexão é recusada. Não existe mais fallback anônimo:
   * qualquer cliente anônimo recebendo eventos da empresa era vazamento.
   */
  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token && modoLocalSemToken()) {
      const contexto = await this.authService.obterContextoLocal();
      if (contexto) {
        client.data.companyId = contexto.companyId;
        client.join(this.roomFor(contexto.companyId));
        return;
      }
    }
    if (!token) {
      // Token por dispositivo: auth.deviceId + auth.deviceToken no handshake.
      const deviceId = client.handshake.auth?.deviceId as string | undefined;
      const deviceToken = client.handshake.auth?.deviceToken as string | undefined;
      if (deviceId && deviceToken) {
        const dispositivo = await this.devicesService.validarDeviceToken(deviceId, deviceToken);
        if (dispositivo) {
          client.data.companyId = dispositivo.machine.company_id;
          client.join(this.roomFor(dispositivo.machine.company_id));
          return;
        }
        this.logger.warn('Conexão WS recusada: dispositivo inválido ou revogado');
        client.disconnect(true);
        return;
      }
      this.logger.warn('Conexão WS recusada: sem token');
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwtService.verify<{ sub: string; companyId: string }>(token);
      if (!payload?.companyId) throw new Error('Token sem companyId');
      client.data.companyId = payload.companyId;
      client.data.userId = payload.sub;
      client.join(this.roomFor(payload.companyId));
    } catch (err) {
      this.logger.warn(`Conexão WS recusada: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // socket.io já remove o client de todas as rooms automaticamente
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    if (fromAuth) return fromAuth;

    const fromQuery = client.handshake.query?.token;
    if (typeof fromQuery === 'string') return fromQuery;

    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);

    return null;
  }

  private roomFor(companyId: string) {
    return `company:${companyId}`;
  }

  /** Emite um evento apenas para os sockets autenticados da empresa informada. */
  emitToCompany(companyId: string, event: string, payload: Record<string, any> = {}) {
    this.server?.to(this.roomFor(companyId)).emit(event, payload);
  }
}
