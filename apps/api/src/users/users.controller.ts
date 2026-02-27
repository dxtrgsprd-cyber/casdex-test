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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateUserRoleDto, UpdateProfileDto } from './dto/users.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
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

  // --- Global admin: manage users in a specific tenant ---

  @Get('by-tenant/:tenantId')
  @UseGuards(RolesGuard)
  @Roles('global_admin')
  async listTenantUsers(
    @Param('tenantId') tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(100), ParseIntPipe) pageSize: number,
  ) {
    const result = await this.usersService.listUsers(tenantId, page, pageSize);
    return { success: true, ...result };
  }

  @Post('by-tenant/:tenantId')
  @UseGuards(RolesGuard)
  @Roles('global_admin')
  async createTenantUser(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateUserDto,
  ) {
    const result = await this.usersService.createUser(tenantId, dto, true);
    return { success: true, data: result };
  }

  // --- User management (admin/manager) ---

  @Get()
  @UseGuards(RolesGuard, PermissionsGuard)
  @RequirePermissions({ module: 'management', action: 'read' })
  async listUsers(
    @CurrentUser() user: RequestUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(25), ParseIntPipe) pageSize: number,
  ) {
    const result = await this.usersService.listUsers(user.tenantId, page, pageSize);
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
  @Roles('admin', 'manager')
  @RequirePermissions({ module: 'management', action: 'create' })
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    const isAdmin = user.roles.includes('admin') || user.roles.includes('manager') || user.isGlobalAdmin;
    const result = await this.usersService.createUser(user.tenantId, dto, isAdmin);
    return { success: true, data: result };
  }

  @Put(':id')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('admin', 'manager')
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
  @Roles('admin', 'manager')
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
  @Roles('admin', 'manager')
  @RequirePermissions({ module: 'management', action: 'delete' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.usersService.deleteUser(id, user.tenantId);
    return result;
  }
}
