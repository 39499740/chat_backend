import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { SearchController } from './controllers/search.controller';
import { SearchService } from './services/search.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
