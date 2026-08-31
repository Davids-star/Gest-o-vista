import * as net from 'net';
import { EventEmitter } from 'events';

export class SimpleMqttClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private connected = false;
  private packetId = 1;
  private buffer: Buffer = Buffer.alloc(0);

  constructor(
    private readonly host: string = 'localhost',
    private readonly port: number = 1883,
    private readonly clientId: string = `nest_gp_${Math.random().toString(36).substring(2, 9)}`,
  ) {
    super();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection({ host: this.host, port: this.port }, () => {
        this.sendConnectPacket();
      });

      this.socket.on('data', (chunk) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.processBuffer(() => {
          if (!this.connected) {
            this.connected = true;
            this.emit('connect');
            resolve();
          }
        });
      });

      this.socket.on('error', (err) => {
        this.emit('error', err);
        if (!this.connected) reject(err);
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.emit('close');
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.connected = false;
    }
  }

  subscribe(topic: string): void {
    if (!this.socket || !this.connected) return;

    const topicBuf = Buffer.from(topic, 'utf-8');
    const varHeader = Buffer.from([ (this.packetId >> 8) & 0xff, this.packetId & 0xff ]);
    this.packetId = (this.packetId % 65535) + 1;

    const payload = Buffer.concat([
      Buffer.from([ (topicBuf.length >> 8) & 0xff, topicBuf.length & 0xff ]),
      topicBuf,
      Buffer.from([ 0x00 ]), // QoS 0
    ]);

    const remainingLength = varHeader.length + payload.length;
    const fixedHeader = Buffer.from([ 0x82, ...this.encodeRemainingLength(remainingLength) ]);
    const packet = Buffer.concat([ fixedHeader, varHeader, payload ]);

    this.socket.write(packet);
  }

  publish(topic: string, message: string | Buffer): void {
    if (!this.socket || !this.connected) return;

    const topicBuf = Buffer.from(topic, 'utf-8');
    const msgBuf = typeof message === 'string' ? Buffer.from(message, 'utf-8') : message;

    const varHeader = Buffer.concat([
      Buffer.from([ (topicBuf.length >> 8) & 0xff, topicBuf.length & 0xff ]),
      topicBuf,
    ]);

    const remainingLength = varHeader.length + msgBuf.length;
    const fixedHeader = Buffer.from([ 0x30, ...this.encodeRemainingLength(remainingLength) ]);
    const packet = Buffer.concat([ fixedHeader, varHeader, msgBuf ]);

    this.socket.write(packet);
  }

  private sendConnectPacket() {
    const protoName = Buffer.from('MQTT', 'utf-8');
    const protoLen = Buffer.from([ 0x00, 0x04 ]);
    const protoLevel = Buffer.from([ 0x04 ]); // MQTT 3.1.1
    const flags = Buffer.from([ 0x02 ]); // Clean Session
    const keepAlive = Buffer.from([ 0x00, 0x3c ]); // 60s

    const clientIdBuf = Buffer.from(this.clientId, 'utf-8');
    const payload = Buffer.concat([
      Buffer.from([ (clientIdBuf.length >> 8) & 0xff, clientIdBuf.length & 0xff ]),
      clientIdBuf,
    ]);

    const varHeader = Buffer.concat([ protoLen, protoName, protoLevel, flags, keepAlive ]);
    const remainingLength = varHeader.length + payload.length;

    const fixedHeader = Buffer.from([ 0x10, ...this.encodeRemainingLength(remainingLength) ]);
    const packet = Buffer.concat([ fixedHeader, varHeader, payload ]);

    this.socket?.write(packet);
  }

  private encodeRemainingLength(length: number): number[] {
    const bytes: number[] = [];
    let x = length;
    do {
      let encodedByte = x % 128;
      x = Math.floor(x / 128);
      if (x > 0) {
        encodedByte |= 128;
      }
      bytes.push(encodedByte);
    } while (x > 0);
    return bytes;
  }

  private decodeRemainingLength(buffer: Buffer, offset: number): { length: number; bytesRead: number } | null {
    let multiplier = 1;
    let value = 0;
    let bytesRead = 0;
    let digit: number;

    do {
      if (offset + bytesRead >= buffer.length) return null;
      digit = buffer[offset + bytesRead];
      value += (digit & 127) * multiplier;
      multiplier *= 128;
      bytesRead++;
      if (multiplier > 128 * 128 * 128) {
        throw new Error('Malformed Remaining Length');
      }
    } while ((digit & 128) !== 0);

    return { length: value, bytesRead };
  }

  private processBuffer(onConnack: () => void) {
    while (this.buffer.length >= 2) {
      const packetType = this.buffer[0] >> 4;
      const decoded = this.decodeRemainingLength(this.buffer, 1);
      if (!decoded) break;

      const headerLen = 1 + decoded.bytesRead;
      const totalLen = headerLen + decoded.length;
      if (this.buffer.length < totalLen) break;

      const packetData = this.buffer.slice(headerLen, totalLen);
      this.buffer = this.buffer.slice(totalLen);

      // Packet Type 2 = CONNACK
      if (packetType === 2) {
        onConnack();
      }
      // Packet Type 3 = PUBLISH
      else if (packetType === 3) {
        this.handlePublishPacket(packetData);
      }
    }
  }

  private handlePublishPacket(packetData: Buffer) {
    if (packetData.length < 2) return;
    const topicLen = (packetData[0] << 8) | packetData[1];
    if (packetData.length < 2 + topicLen) return;

    const topic = packetData.slice(2, 2 + topicLen).toString('utf-8');
    const payload = packetData.slice(2 + topicLen);

    this.emit('message', topic, payload);
  }
}
