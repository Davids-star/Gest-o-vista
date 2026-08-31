import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lot as Lote } from '../database/entities/lot.entity';
import { Product as Produto } from '../database/entities/product.entity';
import { Machine } from '../database/entities/machine.entity';
import { LotesService } from './lotes.service';
import { LotesController } from './lotes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lote, Produto, Machine])],
  providers: [LotesService],
  controllers: [LotesController],
  exports: [LotesService],
})
export class LotesModule {}
