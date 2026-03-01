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
import { SubcontractorsService } from './subcontractors.service';
import {
  CreateSubcontractorDto,
  UpdateSubcontractorDto,
  ListSubcontractorsQueryDto,
} from './dto/subcontractors.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('subcontractors')
@UseGuards(PermissionsGuard)
export class SubcontractorsController {
  constructor(private subsService: SubcontractorsService) {}

  @Get()
  @RequirePermissions({ module: 'subcontractors', action: 'read' })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListSubcontractorsQueryDto,
  ) {
    const result = await this.subsService.list(user.tenantId, query);
    return { success: true, ...result };
  }

  @Get(':id')
  @RequirePermissions({ module: 'subcontractors', action: 'read' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const sub = await this.subsService.get(id, user.tenantId);
    return { success: true, data: sub };
  }

  @Post()
  @RequirePermissions({ module: 'subcontractors', action: 'create' })
  async create(
    @Body() dto: CreateSubcontractorDto,
    @CurrentUser() user: RequestUser,
  ) {
    const sub = await this.subsService.create(user.tenantId, dto);
    return { success: true, data: sub };
  }

  @Put(':id')
  @RequirePermissions({ module: 'subcontractors', action: 'update' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubcontractorDto,
    @CurrentUser() user: RequestUser,
  ) {
    const sub = await this.subsService.update(id, user.tenantId, dto);
    return { success: true, data: sub };
  }

  @Delete(':id')
  @RequirePermissions({ module: 'subcontractors', action: 'delete' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.subsService.delete(id, user.tenantId);
    return result;
  }
}
