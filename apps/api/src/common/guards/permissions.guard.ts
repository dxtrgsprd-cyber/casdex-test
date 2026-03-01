import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';
import { RequestUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser;

    // Global admins bypass permission checks (GOD mode)
    if (user.globalRole === 'global_admin') {
      return true;
    }

    // Global managers bypass permission checks for management module
    if (user.globalRole === 'global_manager') {
      const allManagement = requiredPermissions.every((p) => p.module === 'management');
      if (allManagement) {
        return true;
      }
    }

    // Get the user's role in the current tenant
    const userTenant = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: user.userId, tenantId: user.tenantId } },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });

    if (!userTenant) {
      return false;
    }

    // Check each required permission
    return requiredPermissions.every((required) => {
      const perm = userTenant.role.permissions.find(
        (p) => p.module === required.module && p.action === required.action,
      );
      return perm?.allowed === true;
    });
  }
}
