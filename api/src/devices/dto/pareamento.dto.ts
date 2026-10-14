import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CodigoPareamentoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(64)
  codigo: string;
}

export class ParearAparelhoDto extends CodigoPareamentoDto {
  @IsUUID('4')
  machine_id: string;

  /** Nome livre do aparelho (ex.: "Tablet do forno"); só para identificar na lista de dispositivos. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nome?: string;
}
