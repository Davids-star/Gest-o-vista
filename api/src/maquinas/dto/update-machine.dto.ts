import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMachineDto {
  @IsOptional()
  @IsString({ message: 'Código deve ser texto' })
  @MaxLength(50, { message: 'Código deve ter no máximo 50 caracteres' })
  code?: string;

  @IsOptional()
  @IsString({ message: 'Nome deve ser texto' })
  @MaxLength(255, { message: 'Nome deve ter no máximo 255 caracteres' })
  name?: string;

  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser booleano' })
  active?: boolean;
}
