import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Maquina } from './maquina.entity';
import { Product } from '../database/entities/product.entity';
import { ProductionSession } from '../database/entities/production-session.entity';
import { MaquinasService } from './maquinas.service';
import { MaquinasController } from './maquinas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Maquina, Product, ProductionSession])],
  providers: [MaquinasService],
  controllers: [MaquinasController],
  exports: [MaquinasService],
})
export class MaquinasModule {}
