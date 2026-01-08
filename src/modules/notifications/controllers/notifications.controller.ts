import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto } from '../dto/notification.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: '创建通知' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createNotification(
    @CurrentUser() user: any,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    await this.notificationService.createNotification({
      ...createNotificationDto,
    });
    return { message: '通知创建成功' };
  }

  @Get()
  @ApiOperation({ summary: '获取通知列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'onlyUnread', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: string,
    @Query('onlyUnread') onlyUnread?: boolean,
  ) {
    return await this.notificationService.getUserNotifications(user.id, {
      page,
      limit,
      type: type as any,
      onlyUnread,
    });
  }

  @Get('unread/count')
  @ApiOperation({ summary: '获取未读通知数量' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取通知详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getNotification(@CurrentUser() user: any, @Param('id') id: string) {
    return await this.notificationService.getNotification(id, user.id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    await this.notificationService.markAsRead(id, user.id);
    return { message: '通知已标记为已读' };
  }

  @Put('read/all')
  @ApiOperation({ summary: '标记所有通知为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAllAsRead(@CurrentUser() user: any) {
    const count = await this.notificationService.markAllAsRead(user.id);
    return { message: '所有通知已标记为已读', count };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteNotification(@CurrentUser() user: any, @Param('id') id: string) {
    await this.notificationService.deleteNotification(id, user.id);
    return { message: '通知删除成功' };
  }
}
