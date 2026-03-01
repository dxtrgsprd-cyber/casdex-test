import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser;

    // global_admin bypasses all role checks (GOD mode)
    if (user.globalRole === 'global_admin') {
      return true;
    }

    // Check if user's global role is in the required roles
    // e.g. @Roles('global_admin', 'global_manager') — global_manager would match here
    if (user.globalRole && requiredRoles.includes(user.globalRole)) {
      return true;
    }

    // Check org-level roles
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
