import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { FriendsController } from './controllers/friends.controller';
import { FriendsService } from './services/friends.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
