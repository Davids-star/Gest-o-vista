import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meta } from './meta.entity';
import { MetasService } from './metas.service';
import { MetasController } from './metas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Meta])],
  providers: [MetasService],
  controllers: [MetasController],
  exports: [MetasService],
})
export class MetasModule {}
