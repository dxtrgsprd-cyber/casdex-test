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
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenants.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('tenants')
@UseGuards(RolesGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  // --- Global admin only: tenant CRUD ---

  @Get()
  @Roles('global_admin', 'admin')
  async listTenants() {
    const tenants = await this.tenantsService.listTenants();
    return { success: true, data: tenants };
  }

  @Get(':id')
  @Roles('global_admin', 'admin')
  async getTenant(@Param('id') id: string) {
    const tenant = await this.tenantsService.getTenant(id);
    return { success: true, data: tenant };
  }

  @Post()
  @Roles('global_admin')
  async createTenant(@Body() dto: CreateTenantDto) {
    const tenant = await this.tenantsService.createTenant(dto);
    return { success: true, data: tenant };
  }

  @Put(':id')
  @Roles('global_admin')
  async updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    const tenant = await this.tenantsService.updateTenant(id, dto);
    return { success: true, data: tenant };
  }

  @Delete(':id')
  @Roles('global_admin')
  async deleteTenant(@Param('id') id: string) {
    return this.tenantsService.deleteTenant(id);
  }

  // --- Roles within current tenant ---

  @Get('current/roles')
  async listRoles(@CurrentUser() user: RequestUser) {
    const roles = await this.tenantsService.listRoles(user.tenantId);
    return { success: true, data: roles };
  }
}
