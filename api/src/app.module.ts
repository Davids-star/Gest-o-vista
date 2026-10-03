import * as path from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { MaquinasModule } from './maquinas/maquinas.module';
import { ProdutosModule } from './produtos/produtos.module';
import { LotesModule } from './lotes/lotes.module';
import { SessionsModule } from './sessions/sessions.module';
import { EventsModule } from './events/events.module';
import { MetasModule } from './metas/metas.module';
import { AlertasModule } from './alertas/alertas.module';
import { MotivosParadaModule } from './motivos-parada/motivos-parada.module';
import { ParadasRegistrosModule } from './paradas-registros/paradas-registros.module';
import { DevicesModule } from './devices/devices.module';
import { MqttModule } from './mqtt/mqtt.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ShiftsModule } from './shifts/shifts.module';
import { PossibleStopsModule } from './possible-stops/possible-stops.module';
import { ApontamentoModule } from './apontamento/apontamento.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ALL_ENTITIES } from './database/all-entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Um único .env na raiz do projeto (ver .env.example). Nada de .env por pasta.
      envFilePath: [path.resolve(__dirname, '../../.env')],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DB_HOST'),
        port: Number(configService.getOrThrow<string>('DB_PORT')),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        // getOrThrow: host/username/porta/nome do banco não são segredo,
        // tanto faz ter um valor-padrão pra dev. A senha é diferente — um
        // fallback fraco em texto puro no repo público é a mesma armadilha
        // do JWT_SECRET (ver jwt.strategy.ts).
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_NAME'),
        entities: ALL_ENTITIES,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: false,
        // Schema agora é controlado por migrations revisáveis, não mais
        // sincronizado automaticamente — o banco guarda dado real.
        synchronize: false,
      }),
    }),
    // Limite global por IP (folga para Totem/TV/dashboard com polling). O login
    // tem limite próprio mais apertado (ver AuthController).
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60_000, limit: 600 }]),
    RealtimeModule,
    AuthModule,
    MaquinasModule,
    ProdutosModule,
    LotesModule,
    SessionsModule,
    EventsModule,
    MetasModule,
    AlertasModule,
    MotivosParadaModule,
    ParadasRegistrosModule,
    DevicesModule,
    MqttModule,
    ShiftsModule,
    PossibleStopsModule,
    ApontamentoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
