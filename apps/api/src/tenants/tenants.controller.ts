import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenants.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('tenants')
@UseGuards(RolesGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  // --- Roles within current tenant ---
  // IMPORTANT: Must be defined BEFORE @Get(':id') so NestJS does not
  // match "current" as an :id parameter and return a 404.

  @Get('current/roles')
  async listRoles(@CurrentUser() user: RequestUser) {
    const roles = await this.tenantsService.listRoles(user.tenantId);
    return { success: true, data: roles };
  }

  // --- Global roles + org_admin: tenant listing ---

  @Get()
  @Roles('global_admin', 'global_manager', 'org_admin')
  async listTenants(@CurrentUser() user: RequestUser) {
    // org_admin can only see their own tenant, not all tenants
    if (!user.globalRole && user.roles.includes('org_admin')) {
      const tenant = await this.tenantsService.getTenant(user.tenantId);
      return { success: true, data: [tenant] };
    }
    const tenants = await this.tenantsService.listTenants();
    return { success: true, data: tenants };
  }

  @Get(':id')
  @Roles('global_admin', 'global_manager', 'org_admin')
  async getTenant(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    // org_admin can only view their own tenant
    if (!user.globalRole && user.roles.includes('org_admin') && id !== user.tenantId) {
      throw new ForbiddenException('You can only view your own organization');
    }
    const tenant = await this.tenantsService.getTenant(id);
    return { success: true, data: tenant };
  }

  // global_admin + global_manager can create orgs
  @Post()
  @Roles('global_admin', 'global_manager')
  async createTenant(@Body() dto: CreateTenantDto) {
    const tenant = await this.tenantsService.createTenant(dto);
    return { success: true, data: tenant };
  }

  // global_admin + global_manager can update orgs
  @Put(':id')
  @Roles('global_admin', 'global_manager')
  async updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    const tenant = await this.tenantsService.updateTenant(id, dto);
    return { success: true, data: tenant };
  }

  // ONLY global_admin can delete orgs — global_manager CANNOT
  @Delete(':id')
  @Roles('global_admin')
  async deleteTenant(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    if (user.globalRole !== 'global_admin') {
      throw new ForbiddenException('Only global admins can delete organizations');
    }
    return this.tenantsService.deleteTenant(id);
  }

  // Backfill missing module permissions for all existing tenants
  @Post('backfill-permissions')
  @Roles('global_admin')
  async backfillPermissions() {
    const result = await this.tenantsService.backfillModulePermissions();
    return { success: true, data: result };
  }
}
