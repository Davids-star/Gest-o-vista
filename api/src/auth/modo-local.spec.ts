import { modoLocalSemToken } from './modo-local';

describe('modoLocalSemToken', () => {
  it('liga só com a flag e fora de produção/Render', () => {
    expect(modoLocalSemToken({ MODO_LOCAL_SEM_TOKEN: 'true' } as NodeJS.ProcessEnv)).toBe(true);
  });
  it('nunca liga sem a flag', () => {
    expect(modoLocalSemToken({} as NodeJS.ProcessEnv)).toBe(false);
  });
  it('nunca liga em produção', () => {
    expect(modoLocalSemToken({ MODO_LOCAL_SEM_TOKEN: 'true', NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(false);
  });
  it('nunca liga no Render', () => {
    expect(modoLocalSemToken({ MODO_LOCAL_SEM_TOKEN: 'true', RENDER: 'true' } as NodeJS.ProcessEnv)).toBe(false);
  });
});
