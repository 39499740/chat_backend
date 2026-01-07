import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { MessagesController } from './controllers/messages.controller';
import { MessagesService } from './services/messages.service';
import { GroupChatNotificationService } from './services/group-chat-notification.service';
import { MediaMessageService } from './services/media-message.service';
import { OfflineMessageService } from './services/offline-message.service';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [DatabaseModule, WebSocketModule],
  controllers: [MessagesController],
  providers: [
    MessagesService,
    GroupChatNotificationService,
    MediaMessageService,
    OfflineMessageService,
  ],
  exports: [
    MessagesService,
    GroupChatNotificationService,
    MediaMessageService,
    OfflineMessageService,
  ],
})
export class ChatModule {}
