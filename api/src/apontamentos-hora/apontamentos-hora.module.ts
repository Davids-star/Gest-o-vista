import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApontamentoHora } from './apontamento-hora.entity';
import { ApontamentosHoraService } from './apontamentos-hora.service';
import { ApontamentosHoraController } from './apontamentos-hora.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApontamentoHora])],
  providers: [ApontamentosHoraService],
  controllers: [ApontamentosHoraController],
  exports: [ApontamentosHoraService],
})
export class ApontamentosHoraModule {}
