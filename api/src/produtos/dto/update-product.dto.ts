import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'Nome deve ser texto' })
  @MaxLength(255, { message: 'Nome deve ter no máximo 255 caracteres' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'SKU deve ser texto' })
  @MaxLength(100, { message: 'SKU deve ter no máximo 100 caracteres' })
  sku?: string;

  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser booleano' })
  active?: boolean;
}
