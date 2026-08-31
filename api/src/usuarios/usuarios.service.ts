import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User as Usuario, UserRole as Role } from '../database/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
    constructor(
        @InjectRepository(Usuario)
        private readonly repo: Repository<Usuario>,
    ) { }

    /** GET /usuarios — sempre escopado à empresa do usuário autenticado */
    listarTodos(companyId: string) {
        return this.repo.find({ where: { company_id: companyId } });
    }

    /**
     * Busca por id. `companyId` é opcional só porque o AuthService também usa
     * este método pra resolver o próprio usuário logado (GET /auth/me), onde o
     * id já vem do JWT e não há risco de vazamento. O controller (GET/PATCH/
     * DELETE /usuarios/:id, onde o id vem da URL) SEMPRE deve passar companyId.
     */
    async buscarPorId(id: string, companyId?: string) {
        const where: any = { id };
        if (companyId) where.company_id = companyId;
        const usuario = await this.repo.findOne({ where });
        if (!usuario) throw new NotFoundException(`Usuário ${id} não encontrado`);
        return usuario;
    }

    /** Login: busca global por email — não tem companyId disponível ainda nesse ponto */
    async buscarPorEmail(email: string) {
        return this.repo.findOne({ where: { email } });
    }

    /**
     * Cria usuário SEMPRE dentro da empresa do usuário autenticado que está
     * criando — nunca aceitar company_id vindo do corpo da requisição.
     */
    async criar(companyId: string, dados: { name?: string; nome?: string; email: string; senha?: string; password_hash?: string; role: Role }) {
        const existente = await this.buscarPorEmail(dados.email);
        if (existente) throw new ConflictException('Email já cadastrado');

        const password_hash = dados.senha ? await bcrypt.hash(dados.senha, 10) : (dados.password_hash || null);
        const usuario = this.repo.create({
            company_id: companyId,
            name: dados.name || dados.nome || '',
            email: dados.email,
            password_hash,
            role: dados.role,
        });
        return this.repo.save(usuario);
    }

    async atualizar(id: string, companyId: string, dados: Partial<Usuario>) {
        await this.buscarPorId(id, companyId);
        delete (dados as any).company_id;
        await this.repo.update(id, dados);
        return this.buscarPorId(id, companyId);
    }

    async remover(id: string, companyId: string) {
        await this.buscarPorId(id, companyId);
        return this.repo.delete(id);
    }

    async validarSenha(usuario: Usuario, senha: string) {
        if (!usuario.password_hash) return false;
        return bcrypt.compare(senha, usuario.password_hash);
    }

    /**
     * Usuário "fantasma" (sem senha/login próprio) que representa o Totem/TV
     * da empresa — usado como sub do token de dispositivo de longa duração.
     * Precisa ser um User real (não só um payload JWT) porque Stop.operator_id
     * e AuditLog.user_id têm FK pra users(id).
     */
    async obterOuCriarUsuarioDispositivo(companyId: string) {
        const email = `device.totem-tv@${companyId}.internal`;
        let usuario = await this.repo.findOne({ where: { company_id: companyId, email } });
        if (!usuario) {
            usuario = await this.repo.save(
                this.repo.create({
                    company_id: companyId,
                    name: 'Dispositivo (Totem/TV)',
                    email,
                    password_hash: null,
                    role: Role.OPERADOR,
                    active: true,
                }),
            );
        }
        return usuario;
    }
}
