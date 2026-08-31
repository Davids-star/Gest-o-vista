import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateLotDto {
  @IsString({ message: 'Código deve ser texto' })
  @IsNotEmpty({ message: 'Código é obrigatório' })
  @MaxLength(100, { message: 'Código deve ter no máximo 100 caracteres' })
  code: string;

  @IsUUID('4', { message: 'product_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'product_id é obrigatório' })
  product_id: string;

  @IsOptional()
  @IsUUID('4', { message: 'machine_id deve ser um UUID válido' })
  machine_id?: string;
}
