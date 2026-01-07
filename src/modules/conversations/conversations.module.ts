import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../common/database/database.module';
import { ConversationsController } from './controllers/conversations.controller';
import { ConversationsService } from './services/conversations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
