import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  userId: string;
  email: string;
  tenantId: string;
  roles: string[];
  isGlobalAdmin: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string | string[] | boolean => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser;
    return data ? user[data] : user;
  },
);
