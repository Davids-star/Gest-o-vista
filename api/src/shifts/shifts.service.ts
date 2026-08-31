import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift } from '../database/entities/shift.entity';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly repo: Repository<Shift>,
  ) {}

  listarTodos(companyId: string) {
    return this.repo.find({ where: { company_id: companyId }, order: { start_time: 'ASC' } });
  }

  /**
   * Resolve qual turno cadastrado cobre um horário/dia específico. Usado por
   * SessionsService pra preencher production_sessions.shift_id ao iniciar
   * uma sessão — sem isso, "apontamento por turno" não tem como agrupar nada
   * (todas as sessões ficariam com shift_id nulo).
   *
   * Turnos que cruzam a meia-noite (ex.: 22:00–06:00) são tratados: contam
   * como iniciados no dia anterior quando o horário atual já é depois da
   * meia-noite mas antes do fim do turno.
   */
  async resolverTurnoParaHorario(companyId: string, quando: Date): Promise<Shift | null> {
    const turnos = await this.repo.find({ where: { company_id: companyId, active: true } });
    if (!turnos.length) return null;

    const hhmmss = quando.toTimeString().slice(0, 8);
    const diaSemana = quando.getDay();
    const diaSemanaOntem = (diaSemana + 6) % 7;

    for (const turno of turnos) {
      const cruzaMeiaNoite = turno.start_time > turno.end_time;

      if (!cruzaMeiaNoite) {
        if (turno.days_of_week.includes(diaSemana) && hhmmss >= turno.start_time && hhmmss < turno.end_time) {
          return turno;
        }
      } else {
        if (turno.days_of_week.includes(diaSemana) && hhmmss >= turno.start_time) return turno;
        if (turno.days_of_week.includes(diaSemanaOntem) && hhmmss < turno.end_time) return turno;
      }
    }
    return null;
  }
}
