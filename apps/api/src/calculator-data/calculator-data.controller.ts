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
import { CalculatorDataService } from './calculator-data.service';
import {
  CreateMountConfigDto,
  UpdateMountConfigDto,
  BulkImportMountConfigDto,
  ListMountConfigsQueryDto,
} from './dto/mount-config.dto';
import {
  CreateReferenceDataDto,
  UpdateReferenceDataDto,
  BulkImportReferenceDataDto,
  ListReferenceDataQueryDto,
} from './dto/reference-data.dto';
import {
  CreateComplianceJurisdictionDto,
  UpdateComplianceJurisdictionDto,
  BulkImportComplianceJurisdictionDto,
} from './dto/compliance-jurisdiction.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('calculator-data')
export class CalculatorDataController {
  constructor(private service: CalculatorDataService) {}

  // ==================== MOUNT CONFIGS ====================

  @Get('mount-configs')
  async listMountConfigs(@Query() query: ListMountConfigsQueryDto) {
    const result = await this.service.listMountConfigs(query);
    return { success: true, ...result };
  }

  @Post('mount-configs')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async createMountConfig(@Body() dto: CreateMountConfigDto) {
    const data = await this.service.createMountConfig(dto);
    return { success: true, data };
  }

  @Put('mount-configs/:id')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async updateMountConfig(@Param('id') id: string, @Body() dto: UpdateMountConfigDto) {
    const data = await this.service.updateMountConfig(id, dto);
    return { success: true, data };
  }

  @Delete('mount-configs/:id')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async deleteMountConfig(@Param('id') id: string) {
    return this.service.deleteMountConfig(id);
  }

  @Post('mount-configs/bulk-import')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async bulkImportMountConfigs(@Body() dto: BulkImportMountConfigDto) {
    const result = await this.service.bulkImportMountConfigs(dto.items);
    return { success: true, ...result };
  }

  // ==================== REFERENCE DATA ====================

  @Get('reference')
  async listReferenceData(@Query() query: ListReferenceDataQueryDto) {
    const result = await this.service.listReferenceData(query);
    return { success: true, ...result };
  }

  @Get('reference/categories')
  async listReferenceCategories() {
    const data = await this.service.listReferenceCategories();
    return { success: true, data };
  }

  @Post('reference')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async createReferenceData(@Body() dto: CreateReferenceDataDto) {
    const data = await this.service.createReferenceData(dto);
    return { success: true, data };
  }

  @Put('reference/:id')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async updateReferenceData(@Param('id') id: string, @Body() dto: UpdateReferenceDataDto) {
    const data = await this.service.updateReferenceData(id, dto);
    return { success: true, data };
  }

  @Delete('reference/:id')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async deleteReferenceData(@Param('id') id: string) {
    return this.service.deleteReferenceData(id);
  }

  @Post('reference/bulk-import')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async bulkImportReferenceData(@Body() dto: BulkImportReferenceDataDto) {
    const result = await this.service.bulkImportReferenceData(dto.items);
    return { success: true, ...result };
  }

  // ==================== COMPLIANCE JURISDICTIONS ====================

  @Get('jurisdictions')
  async listJurisdictions() {
    const result = await this.service.listJurisdictions();
    return { success: true, ...result };
  }

  @Get('jurisdictions/export')
  async exportJurisdictions() {
    const data = await this.service.exportJurisdictions();
    return { success: true, data };
  }

  @Post('jurisdictions')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async createJurisdiction(@Body() dto: CreateComplianceJurisdictionDto) {
    const data = await this.service.createJurisdiction(dto);
    return { success: true, data };
  }

  @Put('jurisdictions/:id')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async updateJurisdiction(@Param('id') id: string, @Body() dto: UpdateComplianceJurisdictionDto) {
    const data = await this.service.updateJurisdiction(id, dto);
    return { success: true, data };
  }

  @Delete('jurisdictions/:id')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async deleteJurisdiction(@Param('id') id: string) {
    return this.service.deleteJurisdiction(id);
  }

  @Post('jurisdictions/bulk-import')
  @UseGuards(RolesGuard)
  @Roles('global_admin', 'org_admin', 'org_manager')
  async bulkImportJurisdictions(@Body() dto: BulkImportComplianceJurisdictionDto) {
    const result = await this.service.bulkImportJurisdictions(dto.items);
    return { success: true, ...result };
  }
}
