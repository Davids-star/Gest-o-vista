import { AuthService } from './auth.service';

describe('AuthService.idUsuarioDoAparelho', () => {
  it('devolve o id de um USUÁRIO real da empresa (FK de paradas/auditoria) e guarda em cache', async () => {
    const usuarios = { obterOuCriarUsuarioDispositivo: jest.fn().mockResolvedValue({ id: 'user-aparelho-1' }) };
    const service = new AuthService(usuarios as any, {} as any, {} as any);

    expect(await service.idUsuarioDoAparelho('empresa-a')).toBe('user-aparelho-1');
    expect(await service.idUsuarioDoAparelho('empresa-a')).toBe('user-aparelho-1');
    expect(usuarios.obterOuCriarUsuarioDispositivo).toHaveBeenCalledTimes(1);

    await service.idUsuarioDoAparelho('empresa-b');
    expect(usuarios.obterOuCriarUsuarioDispositivo).toHaveBeenCalledTimes(2);
  });
});
