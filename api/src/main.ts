// Precisa ser o PRIMEIRO import do arquivo: alguns módulos (ex.:
// stop-detection.constants.ts) leem process.env direto num `const` de
// topo de arquivo, avaliado assim que o módulo é importado — ou seja,
// antes de ConfigModule.forRoot() (que só roda dentro do decorator
// @Module de AppModule) ter carregado o .env. Sem isso, essas
// constantes sempre pegavam o valor padrão do código, nunca o do
// .env, mesmo com a variável lá dentro.
import * as path from 'path';
import { config as carregarEnv } from 'dotenv';
carregarEnv({ path: path.resolve(__dirname, '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { corsOrigins } from './common/config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Cabeçalhos de segurança (CSP, nosniff, HSTS...). A API responde JSON/WebSocket,
  // então a CSP restritiva não atrapalha o frontend (que é servido separadamente).
  app.use(helmet());

  // Permite requisições do frontend (localhost e IP da rede local para acesso mobile)
  app.enableCors({
    origin: corsOrigins(),
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
  console.log(`🚀 API rodando em: http://0.0.0.0:${port}`);
}
bootstrap();
