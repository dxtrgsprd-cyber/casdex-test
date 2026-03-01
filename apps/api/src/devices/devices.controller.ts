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
import { DevicesService } from './devices.service';
import { CreateDeviceDto, UpdateDeviceDto, ListDevicesQueryDto } from './dto/devices.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('devices')
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Get()
  async list(@Query() query: ListDevicesQueryDto) {
    const result = await this.devicesService.list(query);
    return { success: true, ...result };
  }

  @Get('manufacturers')
  async manufacturers() {
    const data = await this.devicesService.getManufacturers();
    return { success: true, data };
  }

  @Get('categories')
  async categories() {
    const data = await this.devicesService.getCategories();
    return { success: true, data };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.devicesService.get(id);
    return { success: true, data };
  }

  @Get(':id/mounts')
  async mounts(@Param('id') id: string) {
    const data = await this.devicesService.getMounts(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('global_admin')
  async create(@Body() dto: CreateDeviceDto) {
    const data = await this.devicesService.create(dto);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('global_admin')
  async update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    const data = await this.devicesService.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('global_admin')
  async delete(@Param('id') id: string) {
    const result = await this.devicesService.delete(id);
    return result;
  }
}
