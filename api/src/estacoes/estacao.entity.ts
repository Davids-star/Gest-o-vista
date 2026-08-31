export class Estacao {
  id: string;
  codigo: string;
  apiKey: string;
  ativo: boolean;
  ultimaSincronizacao: Date | null;
  criadoEm: Date;
}
