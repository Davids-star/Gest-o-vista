import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { EventSource } from '../../database/entities/production-event.entity';

/** Teto por evento: uma leitura de sensor acima disso é erro ou abuso, não produção. */
export const MAX_QUANTIDADE_POR_EVENTO = 10_000;

export class CreateEventDto {
  @IsUUID('4', { message: 'session_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'session_id é obrigatório' })
  session_id: string;

  @IsUUID('4', { message: 'machine_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'machine_id é obrigatório' })
  machine_id: string;

  @IsString({ message: 'event_uid deve ser texto' })
  @IsNotEmpty({ message: 'event_uid é obrigatório' })
  @MaxLength(255, { message: 'event_uid deve ter no máximo 255 caracteres' })
  event_uid: string;

  @IsInt({ message: 'quantity deve ser um número inteiro' })
  @Min(1, { message: 'quantity deve ser pelo menos 1' })
  @Max(MAX_QUANTIDADE_POR_EVENTO, { message: `quantity deve ser no máximo ${MAX_QUANTIDADE_POR_EVENTO}` })
  quantity: number;

  @IsOptional()
  @IsDateString({}, { message: 'occurred_at deve ser uma data ISO válida' })
  occurred_at?: string;

  @IsOptional()
  @IsEnum(EventSource, { message: 'source deve ser sensor, simulator, manual ou bluetooth' })
  source?: EventSource;
}
