import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationService } from './services/notification.service';
import { WebSocketModule } from '../websocket/websocket.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [DatabaseModule, WebSocketModule, AuthModule, RedisModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
