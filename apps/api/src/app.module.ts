import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { VendorsModule } from './vendors/vendors.module';
import { SubcontractorsModule } from './subcontractors/subcontractors.module';
import { PrismaModule } from './common/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    NotificationsModule,
    OpportunitiesModule,
    VendorsModule,
    SubcontractorsModule,
    DashboardModule,
  ],
})
export class AppModule {}
