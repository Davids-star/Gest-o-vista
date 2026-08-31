import { Alert, AlertStatus } from '../database/entities/alert.entity';

export { Alert as Alerta, AlertStatus as StatusAlerta };
export enum CorAlerta {
  AMARELO = 'amarelo',
  VERMELHO = 'vermelho',
}
