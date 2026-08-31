export class ApontamentoHora {
  id: string;
  maquinaId: string;
  loteId: string | null;
  turnoId: string | null;
  horaReferencia: Date;
  producaoNoPeriodo: number;
  refugo: number;
  minutosParados: number;
  eficienciaCalculada: number | null;
}
