import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString({ message: 'Nome deve ser texto' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(255, { message: 'Nome deve ter no máximo 255 caracteres' })
  name: string;

  @IsOptional()
  @IsString({ message: 'SKU deve ser texto' })
  @MaxLength(100, { message: 'SKU deve ter no máximo 100 caracteres' })
  sku?: string;
}
