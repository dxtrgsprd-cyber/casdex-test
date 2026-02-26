import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { PrismaModule } from './common/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, TenantsModule],
})
export class AppModule {}
