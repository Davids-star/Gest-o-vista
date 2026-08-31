import { ShiftsService } from './shifts.service';
import { Shift } from '../database/entities/shift.entity';

/** Repo fake — só o suficiente pra resolverTurnoParaHorario funcionar. */
function fakeRepo(turnos: Partial<Shift>[]) {
  return { find: jest.fn().mockResolvedValue(turnos) } as any;
}

const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];
const SEG_A_SAB = [1, 2, 3, 4, 5, 6];

describe('ShiftsService.resolverTurnoParaHorario', () => {
  it('encontra o turno normal (não cruza meia-noite) quando o horário está dentro do intervalo', async () => {
    const manha = { id: 'manha', start_time: '06:00:00', end_time: '14:00:00', days_of_week: TODOS_OS_DIAS, active: true } as Shift;
    const service = new ShiftsService(fakeRepo([manha]));

    // Segunda-feira (2026-08-31 é segunda), 09:00 local (-03:00)
    const quando = new Date('2026-08-31T12:00:00.000Z'); // 09:00 -03:00
    const resultado = await service.resolverTurnoParaHorario('empresa-1', quando);

    expect(resultado?.id).toBe('manha');
  });

  it('não encontra turno quando o horário está fora de qualquer intervalo cadastrado', async () => {
    const manha = { id: 'manha', start_time: '06:00:00', end_time: '14:00:00', days_of_week: TODOS_OS_DIAS, active: true } as Shift;
    const service = new ShiftsService(fakeRepo([manha]));

    // 23:00 local — bem depois do turno das 06h-14h
    const quando = new Date('2026-08-31T02:00:00.000Z'); // 23:00 -03:00 do dia anterior em UTC
    const resultado = await service.resolverTurnoParaHorario('empresa-1', quando);

    expect(resultado).toBeNull();
  });

  it('turno que cruza meia-noite bate no lado de ANTES da meia-noite (ex.: 23:00 dentro de 22:00-06:00)', async () => {
    const noite = { id: 'noite', start_time: '22:00:00', end_time: '06:00:00', days_of_week: TODOS_OS_DIAS, active: true } as Shift;
    const service = new ShiftsService(fakeRepo([noite]));

    const quando = new Date('2026-08-31T02:00:00.000Z'); // 23:00 -03:00
    const resultado = await service.resolverTurnoParaHorario('empresa-1', quando);

    expect(resultado?.id).toBe('noite');
  });

  it('turno que cruza meia-noite bate no lado de DEPOIS da meia-noite (ex.: 03:00 dentro de 22:00-06:00)', async () => {
    const noite = { id: 'noite', start_time: '22:00:00', end_time: '06:00:00', days_of_week: TODOS_OS_DIAS, active: true } as Shift;
    const service = new ShiftsService(fakeRepo([noite]));

    const quando = new Date('2026-08-31T06:00:00.000Z'); // 03:00 -03:00
    const resultado = await service.resolverTurnoParaHorario('empresa-1', quando);

    expect(resultado?.id).toBe('noite');
  });

  it('respeita days_of_week — não bate num dia em que o turno não roda (ex.: domingo)', async () => {
    const segASab = { id: 'seg-sab', start_time: '06:00:00', end_time: '14:00:00', days_of_week: SEG_A_SAB, active: true } as Shift;
    const service = new ShiftsService(fakeRepo([segASab]));

    // 2026-08-30 é um domingo, 09:00 local
    const domingo = new Date('2026-08-30T12:00:00.000Z');
    expect(await service.resolverTurnoParaHorario('empresa-1', domingo)).toBeNull();

    // 2026-08-31 é segunda, mesmo horário — deve bater
    const segunda = new Date('2026-08-31T12:00:00.000Z');
    expect((await service.resolverTurnoParaHorario('empresa-1', segunda))?.id).toBe('seg-sab');
  });

  it('retorna null quando a empresa não tem nenhum turno cadastrado', async () => {
    const service = new ShiftsService(fakeRepo([]));
    const resultado = await service.resolverTurnoParaHorario('empresa-sem-turno', new Date());
    expect(resultado).toBeNull();
  });
});
