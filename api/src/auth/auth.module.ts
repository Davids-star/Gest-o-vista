import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { Company } from '../database/entities/company.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

// @Global(): o JwtAuthGuard é um APP_GUARD (roda pra toda a aplicação) e
// precisa injetar AuthService mesmo em requests de módulos que nunca
// importaram AuthModule diretamente (ex.: DevicesModule) — sem isso o Nest
// não consegue resolver essa dependência fora do próprio AppModule.
@Global()
@Module({
  imports: [
    UsuariosModule,
    TypeOrmModule.forFeature([Company]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // getOrThrow: sem fallback fraco em texto puro no repo — ver
        // jwt.strategy.ts pro motivo.
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        // 8h expirava o login de quem ficava com a aba aberta de um dia pro
        // outro (ou parado no totem/dashboard sem F5) — toda escrita
        // começava a voltar 401 sem aviso nenhum. 30 dias cobre o uso
        // normal sem token nenhum "eterno" tipo o de dispositivo (10 anos,
        // ver AuthService.gerarTokenDispositivo, que é só pra Totem/TV).
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
