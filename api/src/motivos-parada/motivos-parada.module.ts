import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MotivoParada } from './motivo-parada.entity';
import { MotivosParadaService } from './motivos-parada.service';
import { MotivosParadaController } from './motivos-parada.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MotivoParada])],
  providers: [MotivosParadaService],
  controllers: [MotivosParadaController],
  exports: [MotivosParadaService],
})
export class MotivosParadaModule {}
