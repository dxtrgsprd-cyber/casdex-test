import { Controller, Get, Put, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query('unread') unread?: string,
  ) {
    const items = await this.notifications.listForUser(user.userId, unread === 'true');
    return { success: true, data: items };
  }

  @Get('count')
  async count(@CurrentUser() user: RequestUser) {
    const count = await this.notifications.unreadCount(user.userId);
    return { success: true, data: { count } };
  }

  @Put(':id/read')
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.notifications.markAsRead(id, user.userId);
    return { success: true };
  }

  @Put('read-all')
  async markAllRead(@CurrentUser() user: RequestUser) {
    await this.notifications.markAllAsRead(user.userId);
    return { success: true };
  }
}
