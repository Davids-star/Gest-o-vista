import * as net from 'net';
import { Logger } from '@nestjs/common';

export class SimpleMqttBroker {
  private server: net.Server | null = null;
  private readonly logger = new Logger('SimpleMqttBroker');
  private clients: Set<net.Socket> = new Set();
  private subscriptions: Map<net.Socket, Set<string>> = new Map();

  start(port: number = 1883): Promise<boolean> {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        this.clients.add(socket);
        this.subscriptions.set(socket, new Set());

        socket.on('data', (data) => {
          this.handlePacket(socket, data);
        });

        socket.on('error', () => {
          this.cleanupSocket(socket);
        });

        socket.on('close', () => {
          this.cleanupSocket(socket);
        });
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          this.logger.log(`Porta ${port} já está em uso (broker Mosquitto em execução).`);
        } else {
          this.logger.warn(`Erro no broker MQTT embutido: ${err.message}`);
        }
        resolve(false);
      });

      this.server.listen(port, () => {
        this.logger.log(`🚀 Broker MQTT embutido rodando na porta ${port}`);
        resolve(true);
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  private cleanupSocket(socket: net.Socket) {
    this.clients.delete(socket);
    this.subscriptions.delete(socket);
  }

  private handlePacket(socket: net.Socket, data: Buffer) {
    if (data.length < 2) return;
    const packetType = data[0] >> 4;

    // 1. CONNECT -> Responder CONNACK (0x20 0x02 0x00 0x00)
    if (packetType === 1) {
      socket.write(Buffer.from([0x20, 0x02, 0x00, 0x00]));
    }
    // 2. SUBSCRIBE -> Responder SUBACK
    else if (packetType === 8) {
      const packetId = data.length >= 4 ? data.slice(2, 4) : Buffer.from([0x00, 0x01]);
      const suback = Buffer.concat([Buffer.from([0x90, 0x03]), packetId, Buffer.from([0x00])]);
      socket.write(suback);

      if (data.length >= 6) {
        const topicLen = (data[4] << 8) | data[5];
        if (data.length >= 6 + topicLen) {
          const topic = data.slice(6, 6 + topicLen).toString('utf-8');
          this.subscriptions.get(socket)?.add(topic);
        }
      }
    }
    // 3. PUBLISH -> Broadcast para os demais inscritos
    else if (packetType === 3) {
      for (const client of this.clients) {
        if (client !== socket && !client.destroyed) {
          client.write(data);
        }
      }
    }
    // 4. PINGREQ -> Responder PINGRESP
    else if (packetType === 12) {
      socket.write(Buffer.from([0xd0, 0x00]));
    }
  }
}
