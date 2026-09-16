// Precisa ser o PRIMEIRO import do arquivo: alguns módulos (ex.:
// stop-detection.constants.ts) leem process.env direto num `const` de
// topo de arquivo, avaliado assim que o módulo é importado — ou seja,
// antes de ConfigModule.forRoot() (que só roda dentro do decorator
// @Module de AppModule) ter carregado o .env. Sem isso, essas
// constantes sempre pegavam o valor padrão do código, nunca o do
// .env, mesmo com a variável lá dentro.
import 'dotenv/config';

import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Mesmo certificado HTTPS local (mkcert) usado pelo frontend (vite.config.js),
// em ../.certs/ na raiz do repo — não versionado. Necessário pro celular:
// o frontend detecta seu próprio protocolo (window.location.protocol) e
// monta a URL da API com ele (ver frontend/src/services/api.js) — se a
// página é servida em https:// mas a API só fala http://, o navegador
// bloqueia a chamada (mixed content) fora de localhost. Sem os arquivos
// (outra máquina, CI), cai em HTTP normal sem quebrar nada.
const certDir = path.join(__dirname, '..', '..', '.certs');
const certPath = path.join(certDir, 'lan-cert.pem');
const keyPath = path.join(certDir, 'lan-key.pem');
const httpsOptions =
  fs.existsSync(certPath) && fs.existsSync(keyPath)
    ? { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }
    : undefined;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { httpsOptions });

  // Permite requisições do frontend (localhost e IP da rede local para acesso mobile)
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API rodando em: ${httpsOptions ? 'https' : 'http'}://0.0.0.0:${port}`);
}
bootstrap();
