import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { FriendsController } from './controllers/friends.controller';
import { FriendsService } from './services/friends.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
