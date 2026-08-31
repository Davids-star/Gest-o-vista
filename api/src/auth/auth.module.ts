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
        secret: configService.get<string>('JWT_SECRET', 'chave-secreta-dev'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
