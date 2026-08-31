import * as net from 'net';

interface SubscribedClient {
  socket: net.Socket;
  topics: Set<string>;
}

const clients = new Set<SubscribedClient>();

function decodeRemainingLength(buffer: Buffer, offset: number): { length: number; bytesRead: number } | null {
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

function topicMatches(filter: string, topic: string): boolean {
  if (filter === topic || filter === '#') return true;
  const filterParts = filter.split('/');
  const topicParts = topic.split('/');

  for (let i = 0; i < filterParts.length; i++) {
    const f = filterParts[i];
    if (f === '#') return true;
    if (f === '+') continue;
    if (f !== topicParts[i]) return false;
  }
  return filterParts.length === topicParts.length;
}

const server = net.createServer((socket) => {
  const client: SubscribedClient = { socket, topics: new Set() };
  clients.add(client);

  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const packetType = buffer[0] >> 4;
      const decoded = decodeRemainingLength(buffer, 1);
      if (!decoded) break;

      const headerLen = 1 + decoded.bytesRead;
      const totalLen = headerLen + decoded.length;
      if (buffer.length < totalLen) break;

      const packetData = buffer.slice(headerLen, totalLen);
      buffer = buffer.slice(totalLen);

      // 1. CONNECT (0x01) -> Reply CONNACK (0x20 0x02 0x00 0x00)
      if (packetType === 1) {
        socket.write(Buffer.from([0x20, 0x02, 0x00, 0x00]));
      }
      // 8. SUBSCRIBE (0x08) -> Parse topic & reply SUBACK (0x90 0x03 packetId 0x00)
      else if (packetType === 8) {
        if (packetData.length >= 2) {
          const packetId = packetData.slice(0, 2);
          let offset = 2;
          while (offset < packetData.length) {
            const topicLen = (packetData[offset] << 8) | packetData[offset + 1];
            offset += 2;
            const topicFilter = packetData.slice(offset, offset + topicLen).toString('utf-8');
            offset += topicLen + 1; // skip QoS byte
            client.topics.add(topicFilter);
            console.log(`📡 [MQTT BROKER] Cliente inscrito em: ${topicFilter}`);
          }
          socket.write(Buffer.concat([Buffer.from([0x90, 0x03]), packetId, Buffer.from([0x00])]));
        }
      }
      // 3. PUBLISH (0x03) -> Route to subscribed clients
      else if (packetType === 3) {
        if (packetData.length >= 2) {
          const topicLen = (packetData[0] << 8) | packetData[1];
          const topic = packetData.slice(2, 2 + topicLen).toString('utf-8');
          const payload = packetData.slice(2 + topicLen);

          console.log(`📥 [MQTT BROKER] Mensagem no tópico: ${topic} (${payload.length} bytes)`);

          // Encaminhar para todos os clientes inscritos no tópico
          const topicBuf = Buffer.from(topic, 'utf-8');
          const varHeader = Buffer.concat([
            Buffer.from([(topicBuf.length >> 8) & 0xff, topicBuf.length & 0xff]),
            topicBuf,
          ]);

          const remLen = varHeader.length + payload.length;
          const pubHeader = Buffer.from([0x30, remLen]);
          const pubPacket = Buffer.concat([pubHeader, varHeader, payload]);

          for (const c of clients) {
            if (c.socket !== socket) {
              for (const filter of c.topics) {
                if (topicMatches(filter, topic)) {
                  c.socket.write(pubPacket);
                  break;
                }
              }
            }
          }
        }
      }
      // 12. PINGREQ (0x0C) -> Reply PINGRESP (0xD0 0x00)
      else if (packetType === 12) {
        socket.write(Buffer.from([0xd0, 0x00]));
      }
    }
  });

  socket.on('close', () => clients.delete(client));
  socket.on('error', () => clients.delete(client));
});

server.listen(1883, '0.0.0.0', () => {
  console.log('🚀 [MQTT BROKER] Broker local rodando na porta 1883');
});
