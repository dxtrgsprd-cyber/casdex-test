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
import { OpportunitiesService } from './opportunities.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ChangeStatusDto,
  AddTeamMemberDto,
  AssignProjectNumberDto,
  RequestApprovalDto,
  ResolveApprovalDto,
  ListOpportunitiesQueryDto,
} from './dto/opportunities.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('opportunities')
@UseGuards(PermissionsGuard)
export class OpportunitiesController {
  constructor(private oppsService: OpportunitiesService) {}

  // --- Metrics ---

  @Get('metrics')
  @RequirePermissions({ module: 'opportunities', action: 'read' })
  async getMetrics(@CurrentUser() user: RequestUser) {
    const metrics = await this.oppsService.getMetrics(user.tenantId, user.userId, user.roles);
    return { success: true, data: metrics };
  }

  // --- List / Search ---

  @Get()
  @RequirePermissions({ module: 'opportunities', action: 'read' })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListOpportunitiesQueryDto,
  ) {
    const result = await this.oppsService.list(
      user.tenantId,
      user.userId,
      user.roles,
      query,
    );
    return { success: true, ...result };
  }

  // --- Get single OPP ---

  @Get(':id')
  @RequirePermissions({ module: 'opportunities', action: 'read' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const opp = await this.oppsService.get(id, user.tenantId);
    return { success: true, data: opp };
  }

  // --- Create OPP ---

  @Post()
  @RequirePermissions({ module: 'opportunities', action: 'create' })
  async create(
    @Body() dto: CreateOpportunityDto,
    @CurrentUser() user: RequestUser,
  ) {
    const opp = await this.oppsService.create(user.tenantId, user.userId, dto);
    return { success: true, data: opp };
  }

  // --- Update OPP ---

  @Put(':id')
  @RequirePermissions({ module: 'opportunities', action: 'update' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: RequestUser,
  ) {
    const opp = await this.oppsService.update(id, user.tenantId, user.userId, dto);
    return { success: true, data: opp };
  }

  // --- Change Status ---

  @Put(':id/status')
  @RequirePermissions({ module: 'opportunities', action: 'update' })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    const opp = await this.oppsService.changeStatus(id, user.tenantId, user, dto);
    return { success: true, data: opp };
  }

  // --- Team Members ---

  @Post(':id/team')
  @RequirePermissions({ module: 'opportunities', action: 'update' })
  async addTeamMember(
    @Param('id') id: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() user: RequestUser,
  ) {
    const opp = await this.oppsService.addTeamMember(id, user.tenantId, dto);
    return { success: true, data: opp };
  }

  @Delete(':id/team/:memberId')
  @RequirePermissions({ module: 'opportunities', action: 'update' })
  async removeTeamMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const opp = await this.oppsService.removeTeamMember(id, user.tenantId, memberId);
    return { success: true, data: opp };
  }

  // --- Assign Project Number ---

  @Post(':id/project-number')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async assignProjectNumber(
    @Param('id') id: string,
    @Body() dto: AssignProjectNumberDto,
    @CurrentUser() user: RequestUser,
  ) {
    const opp = await this.oppsService.assignProjectNumber(id, user.tenantId, user.userId, dto);
    return { success: true, data: opp };
  }

  // --- Approvals ---

  @Post(':id/approvals')
  @RequirePermissions({ module: 'opportunities', action: 'update' })
  async requestApproval(
    @Param('id') id: string,
    @Body() dto: RequestApprovalDto,
    @CurrentUser() user: RequestUser,
  ) {
    const approval = await this.oppsService.requestApproval(id, user.tenantId, user.userId, dto);
    return { success: true, data: approval };
  }

  @Put(':id/approvals/:approvalId')
  @RequirePermissions({ module: 'opportunities', action: 'update' })
  async resolveApproval(
    @Param('id') id: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: ResolveApprovalDto,
    @CurrentUser() user: RequestUser,
  ) {
    const opp = await this.oppsService.resolveApproval(id, approvalId, user.tenantId, user.userId, dto);
    return { success: true, data: opp };
  }

  // --- Delete OPP ---

  @Delete(':id')
  @RequirePermissions({ module: 'opportunities', action: 'delete' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.oppsService.delete(id, user.tenantId, user.userId, user.roles);
    return result;
  }
}
