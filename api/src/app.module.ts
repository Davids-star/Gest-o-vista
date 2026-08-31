import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
      // As credenciais do Postgres moraram em database/.env — pasta
      // dedicada e isolada do projeto "Batedor de Ponto" (ver database/README.md).
      // api/.env mantém só segredos de aplicação (JWT_SECRET, PORT).
      envFilePath: ['../database/.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'sistema_producao'),
        entities: ALL_ENTITIES,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: false,
        // Schema agora é controlado por migrations revisáveis, não mais
        // sincronizado automaticamente — o banco guarda dado real.
        synchronize: false,
      }),
    }),
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
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
