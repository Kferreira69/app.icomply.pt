import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

// PrismaModule and PermissionsModule are global.
@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
