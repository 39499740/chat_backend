import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { MomentsController } from './controllers/moments.controller';
import { MomentsService } from './services/moments.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MomentsController],
  providers: [MomentsService],
  exports: [MomentsService],
})
export class MomentsModule {}
