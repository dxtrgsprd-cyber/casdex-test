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
import { DesignsService } from './designs.service';
import {
  CreateDesignDto,
  UpdateDesignDto,
  ListDesignsQueryDto,
  ChangeDesignStatusDto,
  AddPlacedDeviceDto,
  UpdatePlacedDeviceDto,
} from './dto/designs.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('designs')
@UseGuards(PermissionsGuard)
export class DesignsController {
  constructor(private designsService: DesignsService) {}

  // --- Designs ---

  @Get()
  @RequirePermissions({ module: 'designs', action: 'read' })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListDesignsQueryDto,
  ) {
    const result = await this.designsService.list(user.tenantId, query);
    return { success: true, ...result };
  }

  @Get(':id')
  @RequirePermissions({ module: 'designs', action: 'read' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.designsService.get(id, user.tenantId);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions({ module: 'designs', action: 'create' })
  async create(
    @Body() dto: CreateDesignDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.designsService.create(user.tenantId, user.userId, dto);
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermissions({ module: 'designs', action: 'update' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDesignDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.designsService.update(id, user.tenantId, dto);
    return { success: true, data };
  }

  @Put(':id/status')
  @RequirePermissions({ module: 'designs', action: 'update' })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeDesignStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.designsService.changeStatus(id, user.tenantId, dto.status);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions({ module: 'designs', action: 'delete' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.designsService.delete(id, user.tenantId);
  }

  // --- Placed Devices ---

  @Post(':id/devices')
  @RequirePermissions({ module: 'designs', action: 'update' })
  async addDevice(
    @Param('id') id: string,
    @Body() dto: AddPlacedDeviceDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.designsService.addDevice(id, user.tenantId, dto);
    return { success: true, data };
  }

  @Put(':id/devices/:deviceId')
  @RequirePermissions({ module: 'designs', action: 'update' })
  async updateDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdatePlacedDeviceDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.designsService.updateDevice(id, deviceId, user.tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id/devices/:deviceId')
  @RequirePermissions({ module: 'designs', action: 'update' })
  async removeDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.designsService.removeDevice(id, deviceId, user.tenantId);
  }

  // --- Hardware Schedule ---

  @Get(':id/hardware-schedule')
  @RequirePermissions({ module: 'designs', action: 'read' })
  async hardwareSchedule(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.designsService.getHardwareSchedule(id, user.tenantId);
    return { success: true, data };
  }

  // --- Statement of Work ---

  @Get(':id/sow')
  @RequirePermissions({ module: 'designs', action: 'read' })
  async sow(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.designsService.getSOW(id, user.tenantId);
    return { success: true, data };
  }
}
