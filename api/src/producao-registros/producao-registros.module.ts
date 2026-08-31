import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProducaoRegistro } from './producao-registro.entity';
import { ProducaoRegistrosService } from './producao-registros.service';
import { ProducaoRegistrosController } from './producao-registros.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProducaoRegistro])],
  providers: [ProducaoRegistrosService],
  controllers: [ProducaoRegistrosController],
  exports: [ProducaoRegistrosService],
})
export class ProducaoRegistrosModule {}
