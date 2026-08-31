import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ChangeLotDto {
  @IsUUID('4', { message: 'machine_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'machine_id é obrigatório' })
  machine_id: string;

  @IsString({ message: 'lot_code deve ser texto' })
  @IsNotEmpty({ message: 'lot_code é obrigatório' })
  lot_code: string;
}
