import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';

/**
 * @Global(): registrado uma única vez em AppModule e disponível para
 * injeção (RealtimeGateway) em qualquer service, sem precisar importar
 * este módulo em cada feature module.
 */
@Global()
@Module({
  imports: [
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'chave-secreta-dev'),
      }),
    }),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
