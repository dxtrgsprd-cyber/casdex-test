import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  userId: string;
  email: string;
  tenantId: string;
  roles: string[];
  globalRole: string | null; // 'global_admin' | 'global_manager' | null
}

// Helper to check if user has any global role
export function isGlobalUser(user: RequestUser): boolean {
  return user.globalRole === 'global_admin' || user.globalRole === 'global_manager';
}

// Helper to check if user is global admin (GOD mode)
export function isGlobalAdmin(user: RequestUser): boolean {
  return user.globalRole === 'global_admin';
}

// Helper to check if user is global manager
export function isGlobalManager(user: RequestUser): boolean {
  return user.globalRole === 'global_manager';
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string | string[] | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser;
    return data ? user[data] : user;
  },
);
