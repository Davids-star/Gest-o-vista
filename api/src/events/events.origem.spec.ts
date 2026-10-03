import { BadRequestException } from '@nestjs/common';
import { assertOrigemPermitida, origemDoEvento } from './events.service';

describe('origem do sensor por máquina', () => {
  it('mapeia cabo (sensor/simulator), bluetooth e manual', () => {
    expect(origemDoEvento('sensor')).toBe('cable');
    expect(origemDoEvento('simulator')).toBe('cable');
    expect(origemDoEvento('bluetooth')).toBe('bluetooth');
    expect(origemDoEvento('manual')).toBeNull();
  });

  it('máquina sem origem configurada aceita qualquer evento', () => {
    expect(() => assertOrigemPermitida(null, 'sensor')).not.toThrow();
    expect(() => assertOrigemPermitida(null, 'bluetooth')).not.toThrow();
  });

  it('máquina em bluetooth recusa evento de cabo e aceita o próprio', () => {
    expect(() => assertOrigemPermitida('bluetooth', 'bluetooth')).not.toThrow();
    expect(() => assertOrigemPermitida('bluetooth', 'sensor')).toThrow(BadRequestException);
    expect(() => assertOrigemPermitida('bluetooth', 'simulator')).toThrow(BadRequestException);
  });

  it('máquina em cabo recusa bluetooth; correção manual sempre passa', () => {
    expect(() => assertOrigemPermitida('cable', 'bluetooth')).toThrow(BadRequestException);
    expect(() => assertOrigemPermitida('cable', 'manual')).not.toThrow();
  });
});
