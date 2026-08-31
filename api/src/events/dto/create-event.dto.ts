import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { EventSource } from '../../database/entities/production-event.entity';

export class CreateEventDto {
  @IsUUID('4', { message: 'session_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'session_id é obrigatório' })
  session_id: string;

  @IsUUID('4', { message: 'machine_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'machine_id é obrigatório' })
  machine_id: string;

  @IsString({ message: 'event_uid deve ser texto' })
  @IsNotEmpty({ message: 'event_uid é obrigatório' })
  event_uid: string;

  @IsInt({ message: 'quantity deve ser um número inteiro' })
  @Min(1, { message: 'quantity deve ser pelo menos 1' })
  quantity: number;

  @IsOptional()
  occurred_at?: string | Date;

  @IsOptional()
  @IsEnum(EventSource, { message: 'source deve ser sensor, simulator ou manual' })
  source?: EventSource;
}
