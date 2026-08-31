import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from '../database/entities/shift.entity';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Shift])],
  providers: [ShiftsService],
  controllers: [ShiftsController],
  exports: [ShiftsService],
})
export class ShiftsModule {}
