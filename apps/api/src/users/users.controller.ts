import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateUserRoleDto, UpdateProfileDto, ListUsersByTenantDto } from './dto/users.dto';
import { CurrentUser, RequestUser, isGlobalAdmin } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // --- Profile (self) ---

  @Get('me')
  async getMyProfile(@CurrentUser() user: RequestUser) {
    const profile = await this.usersService.getMyProfile(user.userId);
    return { success: true, data: profile };
  }

  @Put('me')
  async updateMyProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.usersService.updateProfile(user.userId, dto);
    return { success: true, data: profile };
  }

  // --- User management ---

  @Post('by-tenant/:tenantId')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('global_admin', 'global_manager', 'org_admin')
  @RequirePermissions({ module: 'management', action: 'read' })
  async listUsersByTenant(
    @Param('tenantId') tenantId: string,
    @Body() dto: ListUsersByTenantDto,
    @CurrentUser() user: RequestUser,
  ) {
    // org_admin can only view users within their own tenant
    if (!isGlobalAdmin(user) && user.globalRole !== 'global_manager' && tenantId !== user.tenantId) {
      throw new ForbiddenException('You can only view users in your own organization');
    }
    const result = await this.usersService.listUsersByTenant(tenantId, dto.page ?? 1, dto.pageSize ?? 25, {
      search: dto.search,
      roleId: dto.roleId,
      status: dto.status,
    });
    return { success: true, ...result };
  }

  @Get()
  @UseGuards(RolesGuard, PermissionsGuard)
  @RequirePermissions({ module: 'management', action: 'read' })
  async listUsers(
    @CurrentUser() user: RequestUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(25), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.usersService.listUsers(user.tenantId, page, pageSize, {
      search,
      roleId,
      status,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @UseGuards(RolesGuard, PermissionsGuard)
  @RequirePermissions({ module: 'management', action: 'read' })
  async getUser(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.usersService.getUser(id, user.tenantId);
    return { success: true, data: result };
  }

  @Post()
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('org_admin', 'org_manager')
  @RequirePermissions({ module: 'management', action: 'create' })
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    const isAdmin = user.roles.includes('org_admin') || user.roles.includes('org_manager') || isGlobalAdmin(user);
    const targetTenantId = (isGlobalAdmin(user) && dto.tenantId) ? dto.tenantId : user.tenantId;
    const result = await this.usersService.createUser(targetTenantId, dto, isAdmin);
    return { success: true, data: result };
  }

  @Put(':id')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('org_admin', 'org_manager')
  @RequirePermissions({ module: 'management', action: 'update' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.usersService.updateUser(id, user.tenantId, dto);
    return { success: true, data: result };
  }

  @Put(':id/role')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('org_admin', 'org_manager')
  @RequirePermissions({ module: 'management', action: 'update' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.usersService.updateUserRole(id, user.tenantId, dto);
    return { success: true, data: result };
  }

  @Delete(':id')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('org_admin', 'org_manager')
  @RequirePermissions({ module: 'management', action: 'delete' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.usersService.deleteUser(id, user.tenantId);
    return result;
  }
}
