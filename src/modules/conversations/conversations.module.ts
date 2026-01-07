import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { ConversationsController } from './controllers/conversations.controller';
import { ConversationsService } from './services/conversations.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [DatabaseModule, ChatModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
