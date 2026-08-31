import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ChangeOperatorDto {
  @IsUUID('4', { message: 'machine_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'machine_id é obrigatório' })
  machine_id: string;

  @IsString({ message: 'operator_name deve ser texto' })
  @IsNotEmpty({ message: 'operator_name é obrigatório' })
  operator_name: string;
}
