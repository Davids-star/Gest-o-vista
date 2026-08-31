import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMachineDto {
  @IsString({ message: 'Código deve ser texto' })
  @IsNotEmpty({ message: 'Código é obrigatório' })
  @MaxLength(50, { message: 'Código deve ter no máximo 50 caracteres' })
  code: string;

  @IsString({ message: 'Nome deve ser texto' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(255, { message: 'Nome deve ter no máximo 255 caracteres' })
  name: string;
}
