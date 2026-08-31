import { Machine } from '../database/entities/machine.entity';

export { Machine as Maquina };
export enum StatusMaquina {
  OPERACIONAL = 'operacional',
  ALERTA = 'alerta',
  MANUTENCAO = 'manutencao',
}
