import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEventDto } from './create-event.dto';

/** Máximo de eventos por requisição de lote (o aparelho envia em fatias desse tamanho). */
export const MAX_EVENTOS_POR_LOTE = 200;

export class CreateEventsBatchDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'events deve ter pelo menos 1 evento' })
  @ArrayMaxSize(MAX_EVENTOS_POR_LOTE, { message: `events deve ter no máximo ${MAX_EVENTOS_POR_LOTE} eventos` })
  @ValidateNested({ each: true })
  @Type(() => CreateEventDto)
  events: CreateEventDto[];
}
