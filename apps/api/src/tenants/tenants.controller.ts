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
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenants.dto';
import { CreateUserDto } from '../users/dto/users.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from '../users/users.service';

@Controller('tenants')
@UseGuards(RolesGuard)
export class TenantsController {
  constructor(
    private tenantsService: TenantsService,
    private usersService: UsersService,
  ) {}

  // --- Global admin only: tenant CRUD ---

  @Get()
  @Roles('global_admin', 'admin')
  async listTenants() {
    const tenants = await this.tenantsService.listTenants();
    return { success: true, data: tenants };
  }

  @Get('current/roles')
  async listCurrentTenantRoles(@CurrentUser() user: RequestUser) {
    const roles = await this.tenantsService.listRoles(user.tenantId);
    return { success: true, data: roles };
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

  // --- Users within a specific tenant (global admin only) ---

  @Get(':id/users')
  @Roles('global_admin')
  async listTenantUsers(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(100), ParseIntPipe) pageSize: number,
  ) {
    const result = await this.usersService.listUsers(id, page, pageSize);
    return { success: true, ...result };
  }

  @Post(':id/users')
  @Roles('global_admin')
  async createTenantUser(
    @Param('id') id: string,
    @Body() dto: CreateUserDto,
  ) {
    const result = await this.usersService.createUser(id, dto, true);
    return { success: true, data: result };
  }

  // --- Roles within a specific tenant (global admin only) ---

  @Get(':id/roles')
  @Roles('global_admin')
  async listTenantRoles(@Param('id') id: string) {
    const roles = await this.tenantsService.listRoles(id);
    return { success: true, data: roles };
  }
}
