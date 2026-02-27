import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/roles.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('roles')
@UseGuards(RolesGuard, PermissionsGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @RequirePermissions({ module: 'management', action: 'read' })
  async listRoles(@CurrentUser() user: RequestUser) {
    const roles = await this.rolesService.listRoles(user.tenantId);
    return { success: true, data: roles };
  }

  @Get(':id')
  @RequirePermissions({ module: 'management', action: 'read' })
  async getRole(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const role = await this.rolesService.getRole(id, user.tenantId);
    return { success: true, data: role };
  }

  @Post()
  @Roles('admin', 'manager')
  @RequirePermissions({ module: 'management', action: 'create' })
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: RequestUser,
  ) {
    const role = await this.rolesService.createRole(user.tenantId, dto);
    return { success: true, data: role };
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @RequirePermissions({ module: 'management', action: 'update' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: RequestUser,
  ) {
    const role = await this.rolesService.updateRole(id, user.tenantId, dto);
    return { success: true, data: role };
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @RequirePermissions({ module: 'management', action: 'delete' })
  async deleteRole(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.rolesService.deleteRole(id, user.tenantId);
  }
}
