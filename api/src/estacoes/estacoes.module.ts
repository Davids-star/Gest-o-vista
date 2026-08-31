import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estacao } from './estacao.entity';
import { EstacoesService } from './estacoes.service';
import { EstacoesController } from './estacoes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Estacao])],
  providers: [EstacoesService],
  controllers: [EstacoesController],
  exports: [EstacoesService],
})
export class EstacoesModule {}
