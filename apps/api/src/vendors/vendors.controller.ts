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
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto, ListVendorsQueryDto } from './dto/vendors.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('vendors')
@UseGuards(PermissionsGuard)
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  @Get()
  @RequirePermissions({ module: 'vendors', action: 'read' })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListVendorsQueryDto,
  ) {
    const result = await this.vendorsService.list(user.tenantId, query);
    return { success: true, ...result };
  }

  @Get(':id')
  @RequirePermissions({ module: 'vendors', action: 'read' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const vendor = await this.vendorsService.get(id, user.tenantId);
    return { success: true, data: vendor };
  }

  @Post()
  @RequirePermissions({ module: 'vendors', action: 'create' })
  async create(
    @Body() dto: CreateVendorDto,
    @CurrentUser() user: RequestUser,
  ) {
    const vendor = await this.vendorsService.create(user.tenantId, dto);
    return { success: true, data: vendor };
  }

  @Put(':id')
  @RequirePermissions({ module: 'vendors', action: 'update' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: RequestUser,
  ) {
    const vendor = await this.vendorsService.update(id, user.tenantId, dto);
    return { success: true, data: vendor };
  }

  @Delete(':id')
  @RequirePermissions({ module: 'vendors', action: 'delete' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.vendorsService.delete(id, user.tenantId);
    return result;
  }
}
