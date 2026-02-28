import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { RolesModule } from './roles/roles.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { VendorsModule } from './vendors/vendors.module';
import { SubcontractorsModule } from './subcontractors/subcontractors.module';
import { DevicesModule } from './devices/devices.module';
import { PrismaModule } from './common/prisma.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    RolesModule,
    NotificationsModule,
    OpportunitiesModule,
    DashboardModule,
    VendorsModule,
    SubcontractorsModule,
    DevicesModule,
  ],
})
export class AppModule {}
