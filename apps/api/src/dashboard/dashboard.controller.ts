import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('dashboard')
@UseGuards(PermissionsGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@CurrentUser() user: RequestUser) {
    const data = await this.dashboardService.getDashboard(
      user.tenantId,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }
}
