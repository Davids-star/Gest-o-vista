import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class StartSessionDto {
  @IsUUID('4', { message: 'machine_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'machine_id é obrigatório' })
  machine_id: string;

  @IsUUID('4', { message: 'product_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'product_id é obrigatório' })
  product_id: string;

  @IsString({ message: 'lot_code deve ser texto' })
  @IsNotEmpty({ message: 'lot_code é obrigatório' })
  lot_code: string;

  @IsString({ message: 'operator_name deve ser texto' })
  @IsNotEmpty({ message: 'operator_name é obrigatório' })
  operator_name: string;
}
