import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuariosService } from '../usuarios/usuarios.service';
import { User as Usuario } from '../database/entities/user.entity';
import { Company } from '../database/entities/company.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  /**
   * Contexto usado pelo JwtAuthGuard quando uma rota é @Public() e não veio
   * nenhum token (o caso normal do Totem/TV: tela pública, sem login).
   * Como hoje só existe 1 empresa cadastrada, resolve pra ela — se um dia
   * existir mais de uma, isso precisa de outro jeito de saber qual mostrar
   * (ex.: código da empresa na própria URL do Totem/TV).
   */
  private cachedDefaultCompanyId: string | null = null;

  async obterContextoPublico(): Promise<{ id: string; companyId: string; role: string; email: string } | null> {
    if (!this.cachedDefaultCompanyId) {
      const [empresa] = await this.companyRepo.find({ order: { created_at: 'ASC' }, take: 1 });
      if (!empresa) return null;
      this.cachedDefaultCompanyId = empresa.id;
    }
    const usuario = await this.usuariosService.obterOuCriarUsuarioDispositivo(this.cachedDefaultCompanyId);
    return {
      id: usuario.id,
      companyId: usuario.company_id,
      role: usuario.role,
      email: usuario.email ?? '',
    };
  }

  /** Valida email + senha e retorna o token JWT e dados do usuário */
  async login(email: string, senha: string) {
    const usuario = await this.usuariosService.buscarPorEmail(email);
    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!usuario.active) {
      throw new UnauthorizedException('Usuário inativo');
    }

    const senhaValida = await this.usuariosService.validarSenha(usuario, senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.gerarToken(usuario);
  }

  /** Retorna as informações do usuário autenticado (para GET /auth/me) */
  async me(userId: string) {
    const usuario = await this.usuariosService.buscarPorId(userId);
    if (!usuario || !usuario.active) {
      throw new NotFoundException('Usuário não encontrado ou inativo');
    }

    // Garantir que password_hash nunca é retornado
    const { password_hash, ...dadosUsuario } = usuario;
    return dadosUsuario;
  }

  /**
   * Token de dispositivo — vida longa (10 anos), pra Totem/TV configurarem
   * uma vez e nunca mais depender de login humano nem de outra aba logada.
   * Só um ADMINISTRADOR pode emitir (ver AuthController).
   */
  async gerarTokenDispositivo(companyId: string) {
    const usuario = await this.usuariosService.obterOuCriarUsuarioDispositivo(companyId);
    const payload = {
      sub: usuario.id,
      companyId: usuario.company_id,
      role: usuario.role,
      email: usuario.email,
    };
    const token = this.jwtService.sign(payload, { expiresIn: '3650d' });
    return { access_token: token, accessToken: token };
  }

  private gerarToken(usuario: Usuario) {
    const payload = {
      sub: usuario.id,
      companyId: usuario.company_id,
      role: usuario.role,
      email: usuario.email,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      accessToken: token,
      user: {
        id: usuario.id,
        company_id: usuario.company_id,
        name: usuario.name,
        email: usuario.email,
        role: usuario.role,
      },
    };
  }
}
