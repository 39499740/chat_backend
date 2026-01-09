import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
