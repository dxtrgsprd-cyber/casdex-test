import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { RolesModule } from './roles/roles.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
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
  ],
})
export class AppModule {}
