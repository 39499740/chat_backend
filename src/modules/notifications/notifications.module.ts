import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationService } from './services/notification.service';
import { ChatModule } from '../chat/chat.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [DatabaseModule, ChatModule, RedisModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
