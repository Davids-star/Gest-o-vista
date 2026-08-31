import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserPayload {
  id: string;
  companyId: string;
  role: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;
    return data ? user?.[data] : user;
  },
);
