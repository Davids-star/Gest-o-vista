import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export interface UserPayload {
  id: string;
  companyId: string;
  role: string;
  email: string;
  /** Só em credencial de aparelho (X-Device-Id): a única máquina que ele pode operar. */
  machineId?: string;
  /** Só em credencial de aparelho: id do cadastro do dispositivo (o `id` acima é do usuário de aparelho da empresa). */
  deviceId?: string;
}

/** Aparelho amarrado a uma máquina não opera outra. Usuário logado (sem machineId) passa. */
export function assertMaquinaDoAparelho(user: UserPayload, machineId: string) {
  if (user.machineId && user.machineId !== machineId) {
    throw new ForbiddenException('Este aparelho só pode operar a máquina em que foi cadastrado');
  }
}

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;
    return data ? user?.[data] : user;
  },
);
