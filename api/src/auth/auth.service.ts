import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Company } from '../database/entities/company.entity';
import { User as Usuario } from '../database/entities/user.entity';

/** Hash descartável: igualar o tempo de "e-mail não existe" ao de "senha errada". */
const HASH_FALSO = bcrypt.hashSync('gp-hash-falso', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  /** Contexto usado só no modo local sem token (ver modo-local.ts). */
  async obterContextoLocal() {
    const [empresa] = await this.companyRepo.find({ order: { created_at: 'ASC' }, take: 1 });
    if (!empresa) return null;
    const usuario = await this.usuariosService.obterOuCriarUsuarioDispositivo(empresa.id);
    return { id: usuario.id, companyId: usuario.company_id, role: 'operador', email: usuario.email ?? '' };
  }

  /** Valida email + senha e retorna o token JWT e dados do usuário */
  async login(email: string, senha: string) {
    const usuario = await this.usuariosService.buscarPorEmail(email);

    // Sempre roda um bcrypt e responde a MESMA mensagem para e-mail inexistente,
    // senha errada e usuário inativo — senão o tempo e o texto da resposta
    // revelam quais e-mails existem (enumeração de usuários).
    const senhaValida = usuario?.password_hash
      ? await this.usuariosService.validarSenha(usuario, senha)
      : (await bcrypt.compare(senha, HASH_FALSO), false);
    if (!usuario || !usuario.active || !senhaValida) {
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
   * Token de dispositivo — vida longa (1 ano), pra Totem/TV configurarem
   * uma vez e nunca mais depender de login humano nem de outra aba logada.
   * (Era 10 anos e sem como revogar: aparelho perdido = acesso eterno. Para
   * aparelho novo prefira o token por dispositivo X-Device-Id/X-Device-Token,
   * que pode ser revogado em /devices.)
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
    const token = this.jwtService.sign(payload, { expiresIn: '365d' });
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
