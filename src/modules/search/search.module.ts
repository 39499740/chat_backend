import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { SearchController } from './controllers/search.controller';
import { SearchService } from './services/search.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
