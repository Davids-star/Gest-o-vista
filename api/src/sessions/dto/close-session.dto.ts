import { IsNotEmpty, IsUUID } from 'class-validator';

export class CloseSessionDto {
  @IsUUID('4', { message: 'machine_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'machine_id é obrigatório' })
  machine_id: string;
}
